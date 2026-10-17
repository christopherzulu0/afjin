import { Presence } from '@convex-dev/presence'
import { ConvexError, v } from 'convex/values'
import { components } from './_generated/api'
import type { Id } from './_generated/dataModel'
import { mutation, query, type MutationCtx, type QueryCtx } from './_generated/server'
import { getCurrentUser, getMembership, requireMember, requireUser } from './lib/auth'

export const presence = new Presence(components.presence)

type Ctx = QueryCtx | MutationCtx

export const userRoom = (userId: Id<'users'>) => `user:${userId}`
export const viewingRoom = (conversationId: Id<'conversations'>) => `conv:${conversationId}`
export const typingRoom = (conversationId: Id<'conversations'>) => `typing:${conversationId}`

export async function isOnline(ctx: Ctx, userId: Id<'users'>) {
  return (await presence.listUser(ctx, userId, true)).length > 0
}

export async function viewersOf(ctx: Ctx, conversationId: Id<'conversations'>) {
  const states = await presence.listRoom(ctx, viewingRoom(conversationId), true)
  return new Set(states.map((state) => state.userId))
}

export const heartbeat = mutation({
  args: { roomId: v.string(), userId: v.string(), sessionId: v.string(), interval: v.number() },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx)
    if (args.userId !== user._id) throw new ConvexError('Presence user mismatch.')
    const separator = args.roomId.indexOf(':')
    const scope = args.roomId.slice(0, separator)
    const rawId = args.roomId.slice(separator + 1)
    if (scope === 'user') {
      if (rawId !== user._id) throw new ConvexError('You can only join your own presence room.')
    } else if (scope === 'conv' || scope === 'typing') {
      const conversationId = ctx.db.normalizeId('conversations', rawId)
      if (!conversationId) throw new ConvexError('Unknown conversation.')
      await requireMember(ctx, conversationId, user._id)
    } else {
      throw new ConvexError('Unknown presence room.')
    }
    return await presence.heartbeat(ctx, args.roomId, args.userId, args.sessionId, args.interval)
  },
})

export const list = query({
  args: { roomToken: v.string() },
  handler: async (ctx, { roomToken }) => {
    return await presence.list(ctx, roomToken)
  },
})

export const disconnect = mutation({
  args: { sessionToken: v.string() },
  handler: async (ctx, { sessionToken }) => {
    return await presence.disconnect(ctx, sessionToken)
  },
})

export const typing = query({
  args: { conversationId: v.id('conversations') },
  handler: async (ctx, { conversationId }) => {
    const user = await getCurrentUser(ctx)
    if (!user || !(await getMembership(ctx, conversationId, user._id))) return []
    const states = await presence.listRoom(ctx, typingRoom(conversationId), true)
    const typists: { userId: Id<'users'>; name: string }[] = []
    for (const state of states) {
      const userId = ctx.db.normalizeId('users', state.userId)
      if (!userId || userId === user._id) continue
      const person = await ctx.db.get('users', userId)
      if (person) typists.push({ userId, name: person.name })
    }
    return typists
  },
})
