import { ConvexError, v } from 'convex/values'
import { internalMutation, internalQuery, mutation } from './_generated/server'
import { hasBlocked, listMembers, requireUser } from './lib/auth'
import { summarize } from './messages'
import { viewersOf } from './presence'

export const save = mutation({
  args: { endpoint: v.string(), p256dh: v.string(), auth: v.string() },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx)
    if (!args.endpoint.startsWith('https://')) throw new ConvexError('Invalid push endpoint.')
    const existing = await ctx.db.query('pushSubscriptions').withIndex('by_endpoint', (q) => q.eq('endpoint', args.endpoint)).unique()
    if (existing) await ctx.db.patch('pushSubscriptions', existing._id, { userId: user._id, p256dh: args.p256dh, auth: args.auth })
    else await ctx.db.insert('pushSubscriptions', { userId: user._id, ...args })
    return null
  },
})

export const remove = mutation({
  args: { endpoint: v.string() },
  handler: async (ctx, { endpoint }) => {
    const user = await requireUser(ctx)
    const existing = await ctx.db.query('pushSubscriptions').withIndex('by_endpoint', (q) => q.eq('endpoint', endpoint)).unique()
    if (existing && existing.userId === user._id) await ctx.db.delete('pushSubscriptions', existing._id)
    return null
  },
})

export const deleteEndpoint = internalMutation({
  args: { endpoint: v.string() },
  handler: async (ctx, { endpoint }) => {
    const existing = await ctx.db.query('pushSubscriptions').withIndex('by_endpoint', (q) => q.eq('endpoint', endpoint)).unique()
    if (existing) await ctx.db.delete('pushSubscriptions', existing._id)
    return null
  },
})

export const targetsForMessage = internalQuery({
  args: { messageId: v.id('messages') },
  handler: async (ctx, { messageId }) => {
    const message = await ctx.db.get('messages', messageId)
    if (!message || message.deletedAt) return []
    const conversation = await ctx.db.get('conversations', message.conversationId)
    const sender = await ctx.db.get('users', message.senderId)
    if (!conversation || !sender) return []
    const viewers = await viewersOf(ctx, conversation._id)
    const title = conversation.kind === 'group' ? `${sender.name} · ${conversation.name ?? 'Group'}` : sender.name

    const targets = []
    for (const member of await listMembers(ctx, conversation._id)) {
      if (member.userId === sender._id || member.muted || viewers.has(member.userId)) continue
      if (await hasBlocked(ctx, member.userId, sender._id)) continue
      const recipient = await ctx.db.get('users', member.userId)
      if (!recipient) continue
      let body = summarize(message)
      if (member.translationEnabled && message.body && recipient.language !== message.sourceLanguage) {
        const translation = await ctx.db
          .query('translations')
          .withIndex('by_messageId_and_language', (q) => q.eq('messageId', messageId).eq('language', recipient.language))
          .unique()
        if (translation?.status === 'done' && translation.text) body = translation.text
      }
      const subscriptions = await ctx.db.query('pushSubscriptions').withIndex('by_userId', (q) => q.eq('userId', member.userId)).take(10)
      for (const subscription of subscriptions) {
        targets.push({
          endpoint: subscription.endpoint,
          p256dh: subscription.p256dh,
          auth: subscription.auth,
          payload: JSON.stringify({ title, body, url: `/chat?c=${conversation._id}`, tag: conversation._id }),
        })
      }
    }
    return targets
  },
})
