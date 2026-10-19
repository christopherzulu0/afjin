import { ConvexError, v } from 'convex/values'
import type { Id } from './_generated/dataModel'
import { mutation, query, type MutationCtx, type QueryCtx } from './_generated/server'
import { MAX_GROUP_MEMBERS, getCurrentUser, getMembership, listMembers, randomCode, requireUser } from './lib/auth'
import { findBan, newMembership, openDirect, requireGroupRole } from './lib/groups'
import { rateLimiter } from './lib/limits'

const CODE_LENGTH = 10

function normalizeCode(code: string) {
  const value = code.trim().toUpperCase()
  return /^[A-Z0-9]{10}$/.test(value) ? value : null
}

async function uniqueCode(ctx: MutationCtx) {
  for (let attempt = 0; attempt < 10; attempt++) {
    const code = randomCode(CODE_LENGTH)
    const user = await ctx.db.query('users').withIndex('by_inviteCode', (q) => q.eq('inviteCode', code)).unique()
    const group = await ctx.db.query('conversations').withIndex('by_inviteCode', (q) => q.eq('inviteCode', code)).unique()
    if (!user && !group) return code
  }
  throw new ConvexError('Could not create an invite link. Please try again.')
}

async function resolve(ctx: QueryCtx | MutationCtx, raw: string) {
  const code = normalizeCode(raw)
  if (!code) return null
  const user = await ctx.db.query('users').withIndex('by_inviteCode', (q) => q.eq('inviteCode', code)).unique()
  if (user) return { kind: 'user' as const, user }
  const conversation = await ctx.db.query('conversations').withIndex('by_inviteCode', (q) => q.eq('inviteCode', code)).unique()
  if (conversation && conversation.kind === 'group') return { kind: 'group' as const, conversation }
  return null
}

const invalidInvite = () => new ConvexError({ code: 'invalid_invite', message: 'This invite link is no longer valid. Ask for a new one.' })

export const myInvite = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx)
    return user?.inviteCode ?? null
  },
})

export const ensureMyInvite = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx)
    if (user.inviteCode) return user.inviteCode
    const code = await uniqueCode(ctx)
    await ctx.db.patch('users', user._id, { inviteCode: code })
    return code
  },
})

export const resetMyInvite = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx)
    const code = await uniqueCode(ctx)
    await ctx.db.patch('users', user._id, { inviteCode: code })
    return code
  },
})

export const groupInvite = query({
  args: { conversationId: v.id('conversations') },
  handler: async (ctx, { conversationId }) => {
    const user = await getCurrentUser(ctx)
    if (!user) return null
    const membership = await getMembership(ctx, conversationId, user._id)
    if (!membership || membership.role === 'member') return null
    const conversation = await ctx.db.get('conversations', conversationId)
    return conversation?.kind === 'group' ? conversation.inviteCode ?? null : null
  },
})

async function setGroupCode(ctx: MutationCtx, conversationId: Id<'conversations'>, keepExisting: boolean) {
  const user = await requireUser(ctx)
  await requireGroupRole(ctx, conversationId, user._id, 'admin')
  const conversation = await ctx.db.get('conversations', conversationId)
  if (keepExisting && conversation?.inviteCode) return conversation.inviteCode
  const code = await uniqueCode(ctx)
  await ctx.db.patch('conversations', conversationId, { inviteCode: code })
  return code
}

export const createGroupInvite = mutation({
  args: { conversationId: v.id('conversations') },
  handler: async (ctx, { conversationId }) => await setGroupCode(ctx, conversationId, true),
})

export const resetGroupInvite = mutation({
  args: { conversationId: v.id('conversations') },
  handler: async (ctx, { conversationId }) => await setGroupCode(ctx, conversationId, false),
})

export const disableGroupInvite = mutation({
  args: { conversationId: v.id('conversations') },
  handler: async (ctx, { conversationId }) => {
    const user = await requireUser(ctx)
    await requireGroupRole(ctx, conversationId, user._id, 'admin')
    await ctx.db.patch('conversations', conversationId, { inviteCode: undefined })
    return null
  },
})

export const preview = query({
  args: { code: v.string() },
  handler: async (ctx, { code }) => {
    const viewer = await getCurrentUser(ctx)
    if (!viewer) return null
    const invite = await resolve(ctx, code)
    if (!invite) return null
    if (invite.kind === 'user') {
      const { user } = invite
      return { kind: 'user' as const, name: user.name, imageUrl: user.imageUrl ?? null, language: user.language, pin: user.pin, isSelf: user._id === viewer._id }
    }
    const { conversation } = invite
    const members = await listMembers(ctx, conversation._id)
    return {
      kind: 'group' as const,
      conversationId: conversation._id,
      name: conversation.name ?? 'Group',
      memberCount: members.length,
      alreadyMember: members.some((member) => member.userId === viewer._id),
      banned: Boolean(await findBan(ctx, conversation._id, viewer._id)),
    }
  },
})

export const accept = mutation({
  args: { code: v.string() },
  handler: async (ctx, { code }) => {
    const user = await requireUser(ctx)
    const invite = await resolve(ctx, code)
    if (!invite) throw invalidInvite()

    if (invite.kind === 'user') {
      if (invite.user._id === user._id) throw new ConvexError('That’s your own invite link.')
      return await openDirect(ctx, user, invite.user)
    }

    const conversationId = invite.conversation._id
    const membership = await getMembership(ctx, conversationId, user._id)
    if (membership) {
      if (membership.archived) await ctx.db.patch('members', membership._id, { archived: false })
      return conversationId
    }
    if (await findBan(ctx, conversationId, user._id)) {
      throw new ConvexError({ code: 'banned', message: 'You were banned from this group, so this link doesn’t work for you.' })
    }
    const members = await listMembers(ctx, conversationId)
    if (members.length >= MAX_GROUP_MEMBERS) throw new ConvexError(`Groups can have up to ${MAX_GROUP_MEMBERS} members.`)
    await rateLimiter.limit(ctx, 'startConversation', { key: user._id, throws: true })
    await ctx.db.insert('members', newMembership(conversationId, user._id, 'member', Date.now()))
    return conversationId
  },
})
