import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'

export const memberRole = v.union(v.literal('owner'), v.literal('admin'), v.literal('member'))

export const attachmentKind = v.union(v.literal('image'), v.literal('file'), v.literal('audio'))

export const attachmentValidator = v.object({
  storageId: v.id('_storage'),
  kind: attachmentKind,
  name: v.string(),
  size: v.number(),
  duration: v.optional(v.number()),
})

export const translationStatus = v.union(
  v.literal('pending'),
  v.literal('done'),
  v.literal('same'),
  v.literal('unsupported'),
  v.literal('failed'),
)

export const linkPreviewValidator = v.object({
  url: v.string(),
  title: v.string(),
  description: v.optional(v.string()),
  image: v.optional(v.string()),
  siteName: v.optional(v.string()),
})

export const callKind = v.union(v.literal('voice'), v.literal('video'))
export const callStatus = v.union(v.literal('ringing'), v.literal('active'), v.literal('ended'))
export const callParticipantState = v.union(v.literal('ringing'), v.literal('joined'), v.literal('declined'), v.literal('missed'), v.literal('left'))
export const callOutcome = v.union(v.literal('missed'), v.literal('declined'), v.literal('ended'))

export default defineSchema({
  users: defineTable({
    tokenIdentifier: v.string(),
    name: v.string(),
    imageUrl: v.optional(v.string()),
    pin: v.string(),
    language: v.string(),
    inviteCode: v.optional(v.string()),
  })
    .index('by_tokenIdentifier', ['tokenIdentifier'])
    .index('by_pin', ['pin'])
    .index('by_inviteCode', ['inviteCode']),

  conversations: defineTable({
    kind: v.union(v.literal('direct'), v.literal('group')),
    name: v.optional(v.string()),
    directKey: v.optional(v.string()),
    createdBy: v.id('users'),
    lastMessageAt: v.number(),
    lastMessagePreview: v.optional(v.string()),
    lastMessageSenderId: v.optional(v.id('users')),
    inviteCode: v.optional(v.string()),
  })
    .index('by_directKey', ['directKey'])
    .index('by_inviteCode', ['inviteCode']),

  members: defineTable({
    conversationId: v.id('conversations'),
    userId: v.id('users'),
    role: memberRole,
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
    call: v.optional(v.object({ kind: callKind, outcome: callOutcome, durationMs: v.number() })),
    pinnedAt: v.optional(v.number()),
    pinnedBy: v.optional(v.id('users')),
    forwarded: v.optional(v.boolean()),
    linkPreview: v.optional(linkPreviewValidator),
    linkPreviewDismissed: v.optional(v.boolean()),
  })
    .index('by_conversationId', ['conversationId'])
    .index('by_conversationId_and_pinnedAt', ['conversationId', 'pinnedAt'])
    .searchIndex('search_body', { searchField: 'body', filterFields: ['conversationId'] }),

  translations: defineTable({
    messageId: v.id('messages'),
    language: v.string(),
    text: v.optional(v.string()),
    status: translationStatus,
    detectedLanguage: v.optional(v.string()),
    version: v.number(),
  }).index('by_messageId_and_language', ['messageId', 'language']),

  reactions: defineTable({
    messageId: v.id('messages'),
    userId: v.id('users'),
    emoji: v.string(),
  })
    .index('by_messageId', ['messageId'])
    .index('by_messageId_and_userId', ['messageId', 'userId']),

  calls: defineTable({
    conversationId: v.id('conversations'),
    startedBy: v.id('users'),
    kind: callKind,
    status: callStatus,
    startedAt: v.number(),
    answeredAt: v.optional(v.number()),
    endedAt: v.optional(v.number()),
  }).index('by_conversationId_and_status', ['conversationId', 'status']),

  callParticipants: defineTable({
    callId: v.id('calls'),
    userId: v.id('users'),
    state: callParticipantState,
  })
    .index('by_callId_and_userId', ['callId', 'userId'])
    .index('by_userId_and_state', ['userId', 'state']),

  groupBans: defineTable({
    conversationId: v.id('conversations'),
    userId: v.id('users'),
    bannedBy: v.id('users'),
  }).index('by_conversationId_and_userId', ['conversationId', 'userId']),

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
