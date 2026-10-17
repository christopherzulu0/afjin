import { ConvexError, v } from 'convex/values'
import type { Doc, Id } from './_generated/dataModel'
import { mutation, query, type MutationCtx } from './_generated/server'
import {
  MAX_GROUP_MEMBERS,
  getCurrentUser,
  getMembership,
  hasBlocked,
  listMembers,
  normalizePin,
  requireMember,
  requireUser,
} from './lib/auth'
import { rateLimiter } from './lib/limits'
import { isOnline } from './presence'

function newMembership(conversationId: Id<'conversations'>, userId: Id<'users'>, role: 'owner' | 'member', now: number) {
  return { conversationId, userId, role, lastReadAt: now, unreadCount: 0, muted: false, archived: false, translationEnabled: true, lastMessageAt: now }
}

async function usersByPins(ctx: MutationCtx, pins: string[], viewer: Doc<'users'>) {
  const found = new Map<Id<'users'>, Doc<'users'>>()
  for (const raw of pins) {
    const pin = normalizePin(raw)
    if (!pin) throw new ConvexError(`“${raw}” is not a valid PIN. PINs look like AFJ-7K2P.`)
    const user = await ctx.db.query('users').withIndex('by_pin', (q) => q.eq('pin', pin)).unique()
    if (!user) throw new ConvexError(`No one found with PIN ${pin}.`)
    if (user._id !== viewer._id) found.set(user._id, user)
  }
  return [...found.values()]
}

async function requireGroup(ctx: MutationCtx, conversationId: Id<'conversations'>) {
  const conversation = await ctx.db.get('conversations', conversationId)
  if (!conversation) throw new ConvexError('Conversation not found.')
  if (conversation.kind !== 'group') throw new ConvexError('This only works in group chats.')
  return conversation
}

export const listMine = query({
  args: { archived: v.boolean() },
  handler: async (ctx, { archived }) => {
    const user = await getCurrentUser(ctx)
    if (!user) return []
    const memberships = await ctx.db
      .query('members')
      .withIndex('by_userId_and_archived_and_lastMessageAt', (q) => q.eq('userId', user._id).eq('archived', archived))
      .order('desc')
      .take(50)

    const results = []
    for (const membership of memberships) {
      const conversation = await ctx.db.get('conversations', membership.conversationId)
      if (!conversation) continue
      const people: { _id: Id<'users'>; name: string; imageUrl?: string; language: string; pin: string }[] = []
      for (const member of await listMembers(ctx, conversation._id)) {
        if (member.userId === user._id) continue
        const person = await ctx.db.get('users', member.userId)
        if (person) people.push({ _id: person._id, name: person.name, imageUrl: person.imageUrl, language: person.language, pin: person.pin })
      }
      const other = conversation.kind === 'direct' ? people[0] ?? null : null
      const lastSender = conversation.lastMessageSenderId ? people.find((person) => person._id === conversation.lastMessageSenderId) : undefined
      results.push({
        _id: conversation._id,
        kind: conversation.kind,
        name: conversation.kind === 'group' ? conversation.name ?? 'Group' : other?.name ?? 'Former member',
        imageUrl: other?.imageUrl ?? null,
        other,
        members: people,
        online: other ? await isOnline(ctx, other._id) : false,
        blockedByMe: other ? await hasBlocked(ctx, user._id, other._id) : false,
        blockedMe: other ? await hasBlocked(ctx, other._id, user._id) : false,
        unreadCount: membership.unreadCount,
        muted: membership.muted,
        archived: membership.archived,
        translationEnabled: membership.translationEnabled,
        lastReadAt: membership.lastReadAt,
        lastMessageAt: conversation.lastMessageAt,
        lastMessagePreview: conversation.lastMessagePreview ?? null,
        lastMessageFromMe: conversation.lastMessageSenderId === user._id,
        lastMessageSenderName: lastSender?.name ?? null,
      })
    }
    return results
  },
})

export const archivedCount = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx)
    if (!user) return 0
    const archived = await ctx.db
      .query('members')
      .withIndex('by_userId_and_archived_and_lastMessageAt', (q) => q.eq('userId', user._id).eq('archived', true))
      .take(100)
    return archived.length
  },
})

export const startDirect = mutation({
  args: { pin: v.string() },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx)
    const pin = normalizePin(args.pin)
    if (!pin) throw new ConvexError('PINs look like AFJ-7K2P.')
    const other = await ctx.db.query('users').withIndex('by_pin', (q) => q.eq('pin', pin)).unique()
    if (!other) throw new ConvexError(`No one found with PIN ${pin}.`)
    if (other._id === user._id) throw new ConvexError('That’s your own PIN.')

    const directKey = [user._id, other._id].sort().join(':')
    const existing = await ctx.db.query('conversations').withIndex('by_directKey', (q) => q.eq('directKey', directKey)).unique()
    const now = Date.now()
    if (existing) {
      const membership = await getMembership(ctx, existing._id, user._id)
      if (!membership) await ctx.db.insert('members', newMembership(existing._id, user._id, 'member', now))
      else if (membership.archived) await ctx.db.patch('members', membership._id, { archived: false })
      return existing._id
    }

    await rateLimiter.limit(ctx, 'startConversation', { key: user._id, throws: true })
    const conversationId = await ctx.db.insert('conversations', { kind: 'direct', directKey, createdBy: user._id, lastMessageAt: now })
    await ctx.db.insert('members', newMembership(conversationId, user._id, 'owner', now))
    await ctx.db.insert('members', newMembership(conversationId, other._id, 'member', now))
    return conversationId
  },
})

export const createGroup = mutation({
  args: { name: v.string(), pins: v.array(v.string()) },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx)
    const name = args.name.trim().slice(0, 60)
    if (!name) throw new ConvexError('Give the group a name.')
    const people = await usersByPins(ctx, args.pins, user)
    if (!people.length) throw new ConvexError('Add at least one person by PIN.')
    if (people.length + 1 > MAX_GROUP_MEMBERS) throw new ConvexError(`Groups can have up to ${MAX_GROUP_MEMBERS} members.`)

    await rateLimiter.limit(ctx, 'startConversation', { key: user._id, throws: true })
    const now = Date.now()
    const conversationId = await ctx.db.insert('conversations', { kind: 'group', name, createdBy: user._id, lastMessageAt: now })
    await ctx.db.insert('members', newMembership(conversationId, user._id, 'owner', now))
    for (const person of people) await ctx.db.insert('members', newMembership(conversationId, person._id, 'member', now))
    return conversationId
  },
})

export const addMembers = mutation({
  args: { conversationId: v.id('conversations'), pins: v.array(v.string()) },
  handler: async (ctx, { conversationId, pins }) => {
    const user = await requireUser(ctx)
    await requireMember(ctx, conversationId, user._id)
    await requireGroup(ctx, conversationId)
    const current = await listMembers(ctx, conversationId)
    const existingIds = new Set(current.map((member) => member.userId))
    const people = (await usersByPins(ctx, pins, user)).filter((person) => !existingIds.has(person._id))
    if (current.length + people.length > MAX_GROUP_MEMBERS) throw new ConvexError(`Groups can have up to ${MAX_GROUP_MEMBERS} members.`)
    const now = Date.now()
    for (const person of people) await ctx.db.insert('members', newMembership(conversationId, person._id, 'member', now))
    return people.length
  },
})

export const leave = mutation({
  args: { conversationId: v.id('conversations') },
  handler: async (ctx, { conversationId }) => {
    const user = await requireUser(ctx)
    const membership = await requireMember(ctx, conversationId, user._id)
    await requireGroup(ctx, conversationId)
    await ctx.db.delete('members', membership._id)
    return null
  },
})

export const rename = mutation({
  args: { conversationId: v.id('conversations'), name: v.string() },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx)
    await requireMember(ctx, args.conversationId, user._id)
    await requireGroup(ctx, args.conversationId)
    const name = args.name.trim().slice(0, 60)
    if (!name) throw new ConvexError('Give the group a name.')
    await ctx.db.patch('conversations', args.conversationId, { name })
    return null
  },
})

export const setMuted = mutation({
  args: { conversationId: v.id('conversations'), muted: v.boolean() },
  handler: async (ctx, { conversationId, muted }) => {
    const user = await requireUser(ctx)
    const membership = await requireMember(ctx, conversationId, user._id)
    await ctx.db.patch('members', membership._id, { muted })
    return null
  },
})

export const setArchived = mutation({
  args: { conversationId: v.id('conversations'), archived: v.boolean() },
  handler: async (ctx, { conversationId, archived }) => {
    const user = await requireUser(ctx)
    const membership = await requireMember(ctx, conversationId, user._id)
    await ctx.db.patch('members', membership._id, { archived })
    return null
  },
})

export const setTranslation = mutation({
  args: { conversationId: v.id('conversations'), enabled: v.boolean() },
  handler: async (ctx, { conversationId, enabled }) => {
    const user = await requireUser(ctx)
    const membership = await requireMember(ctx, conversationId, user._id)
    await ctx.db.patch('members', membership._id, { translationEnabled: enabled })
    return null
  },
})

export const markRead = mutation({
  args: { conversationId: v.id('conversations') },
  handler: async (ctx, { conversationId }) => {
    const user = await requireUser(ctx)
    const membership = await requireMember(ctx, conversationId, user._id)
    const conversation = await ctx.db.get('conversations', conversationId)
    if (!conversation) return null
    if (membership.unreadCount === 0 && membership.lastReadAt >= conversation.lastMessageAt) return null
    await ctx.db.patch('members', membership._id, { unreadCount: 0, lastReadAt: Date.now() })
    return null
  },
})

async function directPartner(ctx: MutationCtx, conversationId: Id<'conversations'>, userId: Id<'users'>) {
  const conversation = await ctx.db.get('conversations', conversationId)
  if (!conversation || conversation.kind !== 'direct') throw new ConvexError('You can only block people in one-to-one chats.')
  const partner = (await listMembers(ctx, conversationId)).find((member) => member.userId !== userId)
  if (!partner) throw new ConvexError('This person has left the conversation.')
  return partner.userId
}

export const block = mutation({
  args: { conversationId: v.id('conversations') },
  handler: async (ctx, { conversationId }) => {
    const user = await requireUser(ctx)
    await requireMember(ctx, conversationId, user._id)
    const partnerId = await directPartner(ctx, conversationId, user._id)
    if (!(await hasBlocked(ctx, user._id, partnerId))) await ctx.db.insert('blocks', { blockerId: user._id, blockedId: partnerId })
    return null
  },
})

export const unblock = mutation({
  args: { conversationId: v.id('conversations') },
  handler: async (ctx, { conversationId }) => {
    const user = await requireUser(ctx)
    await requireMember(ctx, conversationId, user._id)
    const partnerId = await directPartner(ctx, conversationId, user._id)
    const existing = await ctx.db
      .query('blocks')
      .withIndex('by_blockerId_and_blockedId', (q) => q.eq('blockerId', user._id).eq('blockedId', partnerId))
      .unique()
    if (existing) await ctx.db.delete('blocks', existing._id)
    return null
  },
})
