import { paginationOptsValidator } from 'convex/server'
import { ConvexError, v } from 'convex/values'
import { internal } from './_generated/api'
import type { Doc, Id } from './_generated/dataModel'
import { internalMutation, mutation, query, type MutationCtx, type QueryCtx } from './_generated/server'
import { getCurrentUser, getMembership, isBlockedBetween, listMembers, requireMember, requireUser } from './lib/auth'
import { pushPool, rateLimiter, translationPool } from './lib/limits'
import { attachmentKind } from './schema'

const MAX_BODY = 4000
const MAX_ATTACHMENTS = 6
const MAX_FILE_BYTES = 10 * 1024 * 1024
const UNDO_WINDOW_MS = 60_000

export function messageVersion(message: Doc<'messages'>) {
  return message.editedAt ?? message._creationTime
}

export function summarize(message: Pick<Doc<'messages'>, 'body' | 'attachments' | 'deletedAt'>) {
  if (message.deletedAt) return 'Message deleted'
  const attachment = message.attachments?.[0]
  if (attachment?.kind === 'audio') return '🎤 Voice message'
  if (message.body) return message.body.length > 140 ? `${message.body.slice(0, 137)}…` : message.body
  if (attachment?.kind === 'image') return '📷 Photo'
  if (attachment) return `📎 ${attachment.name}`
  return ''
}

async function translationFor(ctx: QueryCtx, messageId: Id<'messages'>, language: string) {
  const row = await ctx.db
    .query('translations')
    .withIndex('by_messageId_and_language', (q) => q.eq('messageId', messageId).eq('language', language))
    .unique()
  if (!row) return { status: 'pending' as const, text: null }
  return { status: row.status, text: row.status === 'done' ? row.text ?? null : null }
}

async function queueTranslations(ctx: MutationCtx, message: Doc<'messages'>, members: Doc<'members'>[]) {
  if (!message.body) return
  const languages = new Set<string>()
  for (const member of members) {
    const person = await ctx.db.get('users', member.userId)
    if (person && person.language !== message.sourceLanguage) languages.add(person.language)
  }
  if (!languages.size) return
  const version = messageVersion(message)
  for (const language of languages) {
    await ctx.db.insert('translations', { messageId: message._id, language, status: 'pending', version })
  }
  await translationPool.enqueueAction(ctx, internal.translate.translateMessage, { messageId: message._id }, {
    onComplete: internal.translations.onTranslateComplete,
    context: { messageId: message._id },
  })
}

async function clearTranslations(ctx: MutationCtx, messageId: Id<'messages'>) {
  const rows = await ctx.db
    .query('translations')
    .withIndex('by_messageId_and_language', (q) => q.eq('messageId', messageId))
    .take(50)
  for (const row of rows) await ctx.db.delete('translations', row._id)
}

export const list = query({
  args: { conversationId: v.id('conversations'), paginationOpts: paginationOptsValidator },
  handler: async (ctx, { conversationId, paginationOpts }) => {
    const user = await getCurrentUser(ctx)
    if (!user || !(await getMembership(ctx, conversationId, user._id))) {
      return { page: [], isDone: true, continueCursor: '' }
    }
    const conversation = await ctx.db.get('conversations', conversationId)
    const others = (await listMembers(ctx, conversationId)).filter((member) => member.userId !== user._id)
    const partner = conversation?.kind === 'direct' && others[0] ? await ctx.db.get('users', others[0].userId) : null

    const people = new Map<Id<'users'>, Doc<'users'> | null>()
    const person = async (id: Id<'users'>) => {
      if (!people.has(id)) people.set(id, await ctx.db.get('users', id))
      return people.get(id) ?? null
    }

    const result = await ctx.db
      .query('messages')
      .withIndex('by_conversationId', (q) => q.eq('conversationId', conversationId))
      .order('desc')
      .paginate(paginationOpts)

    const page = []
    for (const message of result.page) {
      const sender = await person(message.senderId)
      const mine = message.senderId === user._id
      const base = {
        _id: message._id,
        _creationTime: message._creationTime,
        conversationId: message.conversationId,
        senderId: message.senderId,
        senderName: sender?.name ?? 'Former member',
        senderImage: sender?.imageUrl ?? null,
        sourceLanguage: message.sourceLanguage,
        readByAll: mine && others.length > 0 && others.every((member) => member.lastReadAt >= message._creationTime),
      }
      if (message.deletedAt) {
        page.push({ ...base, body: '', deleted: true, edited: false, attachments: [], reactions: [], reply: null, translation: null, outgoingTranslation: null })
        continue
      }

      const attachments = []
      for (const attachment of message.attachments ?? []) {
        attachments.push({ ...attachment, url: await ctx.storage.getUrl(attachment.storageId) })
      }
      const reactions = (await ctx.db.query('reactions').withIndex('by_messageId', (q) => q.eq('messageId', message._id)).take(100)).map(
        (reaction) => ({ emoji: reaction.emoji, userId: reaction.userId }),
      )
      let reply = null
      if (message.replyTo) {
        const original = await ctx.db.get('messages', message.replyTo)
        if (original) {
          const author = await person(original.senderId)
          reply = { _id: original._id, senderId: original.senderId, senderName: author?.name ?? 'Former member', summary: summarize(original) }
        }
      }
      const translation = !mine && message.body && message.sourceLanguage !== user.language ? await translationFor(ctx, message._id, user.language) : null
      const outgoingTranslation =
        mine && message.body && partner && partner.language !== message.sourceLanguage
          ? { language: partner.language, ...(await translationFor(ctx, message._id, partner.language)) }
          : null

      page.push({
        ...base,
        body: message.body,
        deleted: false,
        edited: Boolean(message.editedAt),
        attachments,
        reactions,
        reply,
        translation,
        outgoingTranslation,
      })
    }
    return { ...result, page }
  },
})

export const send = mutation({
  args: {
    conversationId: v.id('conversations'),
    body: v.string(),
    replyTo: v.optional(v.id('messages')),
    attachments: v.optional(
      v.array(v.object({ storageId: v.id('_storage'), kind: attachmentKind, name: v.string(), duration: v.optional(v.number()) })),
    ),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx)
    await requireMember(ctx, args.conversationId, user._id)
    const conversation = await ctx.db.get('conversations', args.conversationId)
    if (!conversation) throw new ConvexError('Conversation not found.')

    const body = args.body.trim()
    const requested = args.attachments ?? []
    if (body.length > MAX_BODY) throw new ConvexError(`Messages can be up to ${MAX_BODY} characters.`)
    if (requested.length > MAX_ATTACHMENTS) throw new ConvexError(`You can attach up to ${MAX_ATTACHMENTS} files.`)
    if (!body && !requested.length) throw new ConvexError('Write a message or attach a file.')

    const members = await listMembers(ctx, args.conversationId)
    if (conversation.kind === 'direct') {
      const partner = members.find((member) => member.userId !== user._id)
      if (partner && (await isBlockedBetween(ctx, user._id, partner.userId))) throw new ConvexError('You can’t message this person.')
    }

    await rateLimiter.limit(ctx, 'sendMessage', { key: user._id, throws: true })

    const attachments = []
    for (const item of requested) {
      const metadata = await ctx.db.system.get('_storage', item.storageId)
      if (!metadata) throw new ConvexError('An attachment failed to upload. Please try again.')
      if (metadata.size > MAX_FILE_BYTES) throw new ConvexError(`${item.name} is larger than 10 MB.`)
      const type = metadata.contentType ?? ''
      if (item.kind === 'image' && !type.startsWith('image/')) throw new ConvexError(`${item.name} is not an image.`)
      if (item.kind === 'audio' && !type.startsWith('audio/') && !type.startsWith('video/webm')) throw new ConvexError('Voice notes must be audio.')
      attachments.push({ storageId: item.storageId, kind: item.kind, name: item.name.slice(0, 200), size: metadata.size, duration: item.duration })
    }

    let replyTo: Id<'messages'> | undefined
    if (args.replyTo) {
      const original = await ctx.db.get('messages', args.replyTo)
      if (original && original.conversationId === args.conversationId) replyTo = original._id
    }

    const now = Date.now()
    const messageId = await ctx.db.insert('messages', {
      conversationId: args.conversationId,
      senderId: user._id,
      body,
      sourceLanguage: user.language,
      replyTo,
      attachments: attachments.length ? attachments : undefined,
    })
    const message = (await ctx.db.get('messages', messageId))!

    await ctx.db.patch('conversations', conversation._id, {
      lastMessageAt: now,
      lastMessagePreview: summarize(message),
      lastMessageSenderId: user._id,
    })
    for (const member of members) {
      if (member.userId === user._id) {
        await ctx.db.patch('members', member._id, { lastMessageAt: now, lastReadAt: now, unreadCount: 0 })
      } else {
        await ctx.db.patch('members', member._id, { lastMessageAt: now, unreadCount: member.unreadCount + 1 })
      }
    }

    await queueTranslations(ctx, message, members)
    await pushPool.enqueueAction(ctx, internal.push.notifyMessage, { messageId }, { runAfter: 2500 })
    return messageId
  },
})

async function requireOwnMessage(ctx: MutationCtx, messageId: Id<'messages'>) {
  const user = await requireUser(ctx)
  const message = await ctx.db.get('messages', messageId)
  if (!message) throw new ConvexError('Message not found.')
  if (message.senderId !== user._id) throw new ConvexError('You can only change your own messages.')
  return { user, message }
}

export const edit = mutation({
  args: { messageId: v.id('messages'), body: v.string() },
  handler: async (ctx, args) => {
    const { user, message } = await requireOwnMessage(ctx, args.messageId)
    if (message.deletedAt) throw new ConvexError('This message was deleted.')
    const body = args.body.trim()
    if (body.length > MAX_BODY) throw new ConvexError(`Messages can be up to ${MAX_BODY} characters.`)
    if (!body && !message.attachments?.length) throw new ConvexError('A message can’t be empty.')
    if (body === message.body) return null
    await rateLimiter.limit(ctx, 'editMessage', { key: user._id, throws: true })

    await ctx.db.patch('messages', message._id, { body, editedAt: Date.now() })
    await clearTranslations(ctx, message._id)
    const updated = (await ctx.db.get('messages', message._id))!
    await queueTranslations(ctx, updated, await listMembers(ctx, message.conversationId))

    const conversation = await ctx.db.get('conversations', message.conversationId)
    if (conversation?.lastMessageSenderId === user._id && conversation.lastMessageAt - message._creationTime < 1000) {
      await ctx.db.patch('conversations', conversation._id, { lastMessagePreview: summarize(updated) })
    }
    return null
  },
})

export const remove = mutation({
  args: { messageId: v.id('messages') },
  handler: async (ctx, { messageId }) => {
    const { message } = await requireOwnMessage(ctx, messageId)
    if (message.deletedAt) return null
    await ctx.db.patch('messages', messageId, { deletedAt: Date.now() })
    await ctx.scheduler.runAfter(UNDO_WINDOW_MS, internal.messages.purge, { messageId })
    return null
  },
})

export const restore = mutation({
  args: { messageId: v.id('messages') },
  handler: async (ctx, { messageId }) => {
    const { message } = await requireOwnMessage(ctx, messageId)
    if (!message.deletedAt) return null
    if (Date.now() - message.deletedAt > UNDO_WINDOW_MS - 5_000) throw new ConvexError('It’s too late to undo this.')
    await ctx.db.patch('messages', messageId, { deletedAt: undefined })
    return null
  },
})

export const purge = internalMutation({
  args: { messageId: v.id('messages') },
  handler: async (ctx, { messageId }) => {
    const message = await ctx.db.get('messages', messageId)
    if (!message?.deletedAt) return null
    for (const attachment of message.attachments ?? []) await ctx.storage.delete(attachment.storageId)
    const reactions = await ctx.db.query('reactions').withIndex('by_messageId', (q) => q.eq('messageId', messageId)).take(200)
    for (const reaction of reactions) await ctx.db.delete('reactions', reaction._id)
    await clearTranslations(ctx, messageId)
    await ctx.db.patch('messages', messageId, { body: '', attachments: undefined })
    return null
  },
})

export const react = mutation({
  args: { messageId: v.id('messages'), emoji: v.string() },
  handler: async (ctx, { messageId, emoji }) => {
    const user = await requireUser(ctx)
    const message = await ctx.db.get('messages', messageId)
    if (!message || message.deletedAt) throw new ConvexError('Message not found.')
    await requireMember(ctx, message.conversationId, user._id)
    if (!emoji || emoji.length > 16) throw new ConvexError('Pick a single emoji.')
    const existing = await ctx.db
      .query('reactions')
      .withIndex('by_messageId_and_userId', (q) => q.eq('messageId', messageId).eq('userId', user._id))
      .unique()
    if (existing?.emoji === emoji) await ctx.db.delete('reactions', existing._id)
    else if (existing) await ctx.db.patch('reactions', existing._id, { emoji })
    else await ctx.db.insert('reactions', { messageId, userId: user._id, emoji })
    return null
  },
})

export const search = query({
  args: { conversationId: v.id('conversations'), text: v.string() },
  handler: async (ctx, { conversationId, text }) => {
    const user = await getCurrentUser(ctx)
    if (!user || !(await getMembership(ctx, conversationId, user._id))) return []
    const term = text.trim()
    if (term.length < 2) return []
    const results = await ctx.db
      .query('messages')
      .withSearchIndex('search_body', (q) => q.search('body', term).eq('conversationId', conversationId))
      .take(50)
    return results.filter((message) => !message.deletedAt).map((message) => ({ _id: message._id, _creationTime: message._creationTime }))
  },
})
