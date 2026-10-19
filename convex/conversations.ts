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
import { ROLE_RANK, findBan, newMembership, openDirect, requireGroup, requireGroupRole } from './lib/groups'
import { rateLimiter } from './lib/limits'
import { isOnline } from './presence'

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
      const people: { _id: Id<'users'>; name: string; imageUrl?: string; language: string; pin: string; role: Doc<'members'>['role'] }[] = []
      for (const member of await listMembers(ctx, conversation._id)) {
        if (member.userId === user._id) continue
        const person = await ctx.db.get('users', member.userId)
        if (person) {
          people.push({ _id: person._id, name: person.name, imageUrl: person.imageUrl, language: person.language, pin: person.pin, role: member.role })
        }
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
        myRole: membership.role,
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
    return await openDirect(ctx, user, other)
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

async function requireManageableMember(ctx: MutationCtx, conversationId: Id<'conversations'>, actor: Doc<'members'>, userId: Id<'users'>) {
  if (userId === actor.userId) throw new ConvexError('Use “Leave group” to leave yourself.')
  const target = await getMembership(ctx, conversationId, userId)
  if (!target) throw new ConvexError('That person isn’t in this group.')
  if (ROLE_RANK[actor.role] <= ROLE_RANK[target.role]) {
    throw new ConvexError({ code: 'forbidden', message: target.role === 'owner' ? 'Nobody can remove the group owner.' : 'Only the owner can remove an admin.' })
  }
  return target
}

export const addMembers = mutation({
  args: { conversationId: v.id('conversations'), pins: v.array(v.string()) },
  handler: async (ctx, { conversationId, pins }) => {
    const user = await requireUser(ctx)
    await requireGroupRole(ctx, conversationId, user._id, 'admin')
    const current = await listMembers(ctx, conversationId)
    const existingIds = new Set(current.map((member) => member.userId))
    const people = (await usersByPins(ctx, pins, user)).filter((person) => !existingIds.has(person._id))
    for (const person of people) {
      if (await findBan(ctx, conversationId, person._id)) throw new ConvexError(`${person.name} was banned from this group. Unban them first.`)
    }
    if (current.length + people.length > MAX_GROUP_MEMBERS) throw new ConvexError(`Groups can have up to ${MAX_GROUP_MEMBERS} members.`)
    const now = Date.now()
    for (const person of people) await ctx.db.insert('members', newMembership(conversationId, person._id, 'member', now))
    return people.length
  },
})

export const removeMember = mutation({
  args: { conversationId: v.id('conversations'), userId: v.id('users') },
  handler: async (ctx, { conversationId, userId }) => {
    const user = await requireUser(ctx)
    const actor = await requireGroupRole(ctx, conversationId, user._id, 'admin')
    const target = await requireManageableMember(ctx, conversationId, actor, userId)
    await ctx.db.delete('members', target._id)
    return null
  },
})

export const banMember = mutation({
  args: { conversationId: v.id('conversations'), userId: v.id('users') },
  handler: async (ctx, { conversationId, userId }) => {
    const user = await requireUser(ctx)
    const actor = await requireGroupRole(ctx, conversationId, user._id, 'admin')
    const target = await requireManageableMember(ctx, conversationId, actor, userId)
    await ctx.db.delete('members', target._id)
    if (!(await findBan(ctx, conversationId, userId))) await ctx.db.insert('groupBans', { conversationId, userId, bannedBy: user._id })
    return null
  },
})

export const unbanMember = mutation({
  args: { conversationId: v.id('conversations'), userId: v.id('users') },
  handler: async (ctx, { conversationId, userId }) => {
    const user = await requireUser(ctx)
    await requireGroupRole(ctx, conversationId, user._id, 'admin')
    const ban = await findBan(ctx, conversationId, userId)
    if (ban) await ctx.db.delete('groupBans', ban._id)
    return null
  },
})

export const setRole = mutation({
  args: { conversationId: v.id('conversations'), userId: v.id('users'), role: v.union(v.literal('admin'), v.literal('member')) },
  handler: async (ctx, { conversationId, userId, role }) => {
    const user = await requireUser(ctx)
    await requireGroupRole(ctx, conversationId, user._id, 'owner')
    if (userId === user._id) throw new ConvexError('You’re the owner of this group.')
    const target = await getMembership(ctx, conversationId, userId)
    if (!target) throw new ConvexError('That person isn’t in this group.')
    await ctx.db.patch('members', target._id, { role })
    return null
  },
})

export const bannedMembers = query({
  args: { conversationId: v.id('conversations') },
  handler: async (ctx, { conversationId }) => {
    const user = await getCurrentUser(ctx)
    const membership = user ? await getMembership(ctx, conversationId, user._id) : null
    if (!membership || ROLE_RANK[membership.role] < ROLE_RANK.admin) return []
    const bans = await ctx.db
      .query('groupBans')
      .withIndex('by_conversationId_and_userId', (q) => q.eq('conversationId', conversationId))
      .take(50)
    const people = []
    for (const ban of bans) {
      const person = await ctx.db.get('users', ban.userId)
      if (person) people.push({ _id: person._id, name: person.name, imageUrl: person.imageUrl ?? null, pin: person.pin })
    }
    return people
  },
})

export const leave = mutation({
  args: { conversationId: v.id('conversations') },
  handler: async (ctx, { conversationId }) => {
    const user = await requireUser(ctx)
    const membership = await requireMember(ctx, conversationId, user._id)
    await requireGroup(ctx, conversationId)
    if (membership.role === 'owner') {
      const others = (await listMembers(ctx, conversationId)).filter((member) => member.userId !== user._id)
      const successor = others.find((member) => member.role === 'admin') ?? others[0]
      if (successor) await ctx.db.patch('members', successor._id, { role: 'owner' })
    }
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
