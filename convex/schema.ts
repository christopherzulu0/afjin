import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'

export const attachmentKind = v.union(v.literal('image'), v.literal('file'), v.literal('audio'))

export const attachmentValidator = v.object({
  storageId: v.id('_storage'),
  kind: attachmentKind,
  name: v.string(),
  size: v.number(),
  duration: v.optional(v.number()),
})

export const translationStatus = v.union(v.literal('pending'), v.literal('done'), v.literal('unsupported'), v.literal('failed'))

export default defineSchema({
  users: defineTable({
    tokenIdentifier: v.string(),
    name: v.string(),
    imageUrl: v.optional(v.string()),
    pin: v.string(),
    language: v.string(),
  })
    .index('by_tokenIdentifier', ['tokenIdentifier'])
    .index('by_pin', ['pin']),

  conversations: defineTable({
    kind: v.union(v.literal('direct'), v.literal('group')),
    name: v.optional(v.string()),
    directKey: v.optional(v.string()),
    createdBy: v.id('users'),
    lastMessageAt: v.number(),
    lastMessagePreview: v.optional(v.string()),
    lastMessageSenderId: v.optional(v.id('users')),
  }).index('by_directKey', ['directKey']),

  members: defineTable({
    conversationId: v.id('conversations'),
    userId: v.id('users'),
    role: v.union(v.literal('owner'), v.literal('member')),
    lastReadAt: v.number(),
    unreadCount: v.number(),
    muted: v.boolean(),
    archived: v.boolean(),
    translationEnabled: v.boolean(),
    lastMessageAt: v.number(),
  })
    .index('by_userId_and_archived_and_lastMessageAt', ['userId', 'archived', 'lastMessageAt'])
    .index('by_conversationId_and_userId', ['conversationId', 'userId']),

  messages: defineTable({
    conversationId: v.id('conversations'),
    senderId: v.id('users'),
    body: v.string(),
    sourceLanguage: v.string(),
    replyTo: v.optional(v.id('messages')),
    attachments: v.optional(v.array(attachmentValidator)),
    editedAt: v.optional(v.number()),
    deletedAt: v.optional(v.number()),
  })
    .index('by_conversationId', ['conversationId'])
    .searchIndex('search_body', { searchField: 'body', filterFields: ['conversationId'] }),

  translations: defineTable({
    messageId: v.id('messages'),
    language: v.string(),
    text: v.optional(v.string()),
    status: translationStatus,
    version: v.number(),
  }).index('by_messageId_and_language', ['messageId', 'language']),

  reactions: defineTable({
    messageId: v.id('messages'),
    userId: v.id('users'),
    emoji: v.string(),
  })
    .index('by_messageId', ['messageId'])
    .index('by_messageId_and_userId', ['messageId', 'userId']),

  blocks: defineTable({
    blockerId: v.id('users'),
    blockedId: v.id('users'),
  }).index('by_blockerId_and_blockedId', ['blockerId', 'blockedId']),

  pushSubscriptions: defineTable({
    userId: v.id('users'),
    endpoint: v.string(),
    p256dh: v.string(),
    auth: v.string(),
  })
    .index('by_userId', ['userId'])
    .index('by_endpoint', ['endpoint']),
})
