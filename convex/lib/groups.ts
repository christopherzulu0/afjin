import { ConvexError } from 'convex/values'
import type { Doc, Id } from '../_generated/dataModel'
import type { MutationCtx, QueryCtx } from '../_generated/server'
import { getMembership, requireMember } from './auth'
import { rateLimiter } from './limits'

export type Role = Doc<'members'>['role']
export const ROLE_RANK: Record<Role, number> = { member: 0, admin: 1, owner: 2 }

export function newMembership(conversationId: Id<'conversations'>, userId: Id<'users'>, role: Role, now: number) {
  return { conversationId, userId, role, lastReadAt: now, unreadCount: 0, muted: false, archived: false, translationEnabled: true, lastMessageAt: now }
}

export async function requireGroup(ctx: QueryCtx | MutationCtx, conversationId: Id<'conversations'>) {
  const conversation = await ctx.db.get('conversations', conversationId)
  if (!conversation) throw new ConvexError('Conversation not found.')
  if (conversation.kind !== 'group') throw new ConvexError('This only works in group chats.')
  return conversation
}

export async function requireGroupRole(ctx: QueryCtx | MutationCtx, conversationId: Id<'conversations'>, userId: Id<'users'>, minRole: 'admin' | 'owner') {
  await requireGroup(ctx, conversationId)
  const membership = await requireMember(ctx, conversationId, userId)
  if (ROLE_RANK[membership.role] < ROLE_RANK[minRole]) {
    throw new ConvexError({ code: 'forbidden', message: minRole === 'owner' ? 'Only the group owner can do that.' : 'Only group admins can do that.' })
  }
  return membership
}

export async function findBan(ctx: QueryCtx | MutationCtx, conversationId: Id<'conversations'>, userId: Id<'users'>) {
  return await ctx.db
    .query('groupBans')
    .withIndex('by_conversationId_and_userId', (q) => q.eq('conversationId', conversationId).eq('userId', userId))
    .unique()
}

export async function openDirect(ctx: MutationCtx, user: Doc<'users'>, other: Doc<'users'>) {
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
}
