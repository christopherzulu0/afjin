import { v } from 'convex/values'
import type { DataModel } from './_generated/dataModel'
import { internalMutation, internalQuery } from './_generated/server'
import { translationPool } from './lib/limits'
import { messageVersion } from './messages'
import { translationStatus } from './schema'

export const getJob = internalQuery({
  args: { messageId: v.id('messages') },
  handler: async (ctx, { messageId }) => {
    const message = await ctx.db.get('messages', messageId)
    if (!message || message.deletedAt || !message.body) return null
    const version = messageVersion(message)
    const rows = await ctx.db
      .query('translations')
      .withIndex('by_messageId_and_language', (q) => q.eq('messageId', messageId))
      .take(50)
    return {
      body: message.body,
      version,
      languages: rows.filter((row) => row.status === 'pending' && row.version === version).map((row) => row.language),
    }
  },
})

export const save = internalMutation({
  args: { messageId: v.id('messages'), language: v.string(), version: v.number(), status: translationStatus, text: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const message = await ctx.db.get('messages', args.messageId)
    if (!message || messageVersion(message) !== args.version) return null
    const existing = await ctx.db
      .query('translations')
      .withIndex('by_messageId_and_language', (q) => q.eq('messageId', args.messageId).eq('language', args.language))
      .unique()
    const fields = { status: args.status, text: args.text, version: args.version }
    if (existing) await ctx.db.patch('translations', existing._id, fields)
    else await ctx.db.insert('translations', { messageId: args.messageId, language: args.language, ...fields })
    return null
  },
})

const completionContext = v.object({ messageId: v.id('messages') })

export const onTranslateComplete = translationPool.defineOnComplete<DataModel, typeof completionContext>({
  context: completionContext,
  handler: async (ctx, { context, result }) => {
    if (result.kind === 'success') return
    const rows = await ctx.db
      .query('translations')
      .withIndex('by_messageId_and_language', (q) => q.eq('messageId', context.messageId))
      .take(50)
    for (const row of rows) {
      if (row.status === 'pending') await ctx.db.patch('translations', row._id, { status: 'failed' })
    }
  },
})
