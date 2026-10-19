import { ConvexError } from 'convex/values'
import type { Doc, Id } from '../_generated/dataModel'
import type { MutationCtx, QueryCtx } from '../_generated/server'

export const MAX_GROUP_MEMBERS = 50

type Ctx = QueryCtx | MutationCtx

export async function getCurrentUser(ctx: Ctx): Promise<Doc<'users'> | null> {
  const identity = await ctx.auth.getUserIdentity()
  if (!identity) return null
  return await ctx.db
    .query('users')
    .withIndex('by_tokenIdentifier', (q) => q.eq('tokenIdentifier', identity.tokenIdentifier))
    .unique()
}

export async function requireUser(ctx: Ctx): Promise<Doc<'users'>> {
  const user = await getCurrentUser(ctx)
  if (!user) throw new ConvexError('Sign in to continue.')
  return user
}

export async function getMembership(ctx: Ctx, conversationId: Id<'conversations'>, userId: Id<'users'>) {
  return await ctx.db
    .query('members')
    .withIndex('by_conversationId_and_userId', (q) => q.eq('conversationId', conversationId).eq('userId', userId))
    .unique()
}

export async function requireMember(ctx: Ctx, conversationId: Id<'conversations'>, userId: Id<'users'>) {
  const membership = await getMembership(ctx, conversationId, userId)
  if (!membership) throw new ConvexError({ code: 'not_member', message: 'You are not part of this conversation.' })
  return membership
}

export async function listMembers(ctx: Ctx, conversationId: Id<'conversations'>) {
  return await ctx.db
    .query('members')
    .withIndex('by_conversationId_and_userId', (q) => q.eq('conversationId', conversationId))
    .take(MAX_GROUP_MEMBERS)
}

export async function hasBlocked(ctx: Ctx, blockerId: Id<'users'>, blockedId: Id<'users'>) {
  const block = await ctx.db
    .query('blocks')
    .withIndex('by_blockerId_and_blockedId', (q) => q.eq('blockerId', blockerId).eq('blockedId', blockedId))
    .unique()
  return block !== null
}

export async function isBlockedBetween(ctx: Ctx, a: Id<'users'>, b: Id<'users'>) {
  return (await hasBlocked(ctx, a, b)) || (await hasBlocked(ctx, b, a))
}

export const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

export function randomCode(length: number) {
  const bytes = new Uint8Array(length)
  crypto.getRandomValues(bytes)
  let code = ''
  for (const byte of bytes) code += CODE_ALPHABET[byte % CODE_ALPHABET.length]
  return code
}

export function normalizePin(pin: string) {
  const value = pin.trim().toUpperCase()
  return /^AFJ-[A-Z0-9]{4}$/.test(value) ? value : null
}
