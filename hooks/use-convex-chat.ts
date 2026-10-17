'use client'

import { useEffect, useMemo, useState } from 'react'
import { useUser } from '@clerk/nextjs'
import { ConvexError } from 'convex/values'
import type { FunctionReturnType } from 'convex/server'
import type { OptimisticLocalStore } from 'convex/browser'
import {
  insertAtTop,
  optimisticallyUpdateValueInPaginatedQuery,
  useConvexAuth,
  useMutation,
  usePaginatedQuery,
  useQuery,
} from 'convex/react'
import { api } from '@/convex/_generated/api'
import type { Id } from '@/convex/_generated/dataModel'
import { colorFor, initialsFor, uid, type Conversation, type Message, type TranslationState } from '@/lib/chat-data'
import { firstName as firstNameOf } from '@/lib/chat-format'

type ConversationDoc = FunctionReturnType<typeof api.conversations.listMine>[number]
type MessageDoc = FunctionReturnType<typeof api.messages.list>['page'][number]

const PAGE_SIZE = 30
const localPreviews = new Map<string, string>()
const optimisticIds = new Set<string>()

export function rememberPreview(storageId: string, url: string) {
  localPreviews.set(storageId, url)
}

export function errorMessage(error: unknown, fallback = 'Something went wrong. Check your connection and try again.') {
  if (error instanceof ConvexError) {
    const data: unknown = error.data
    if (typeof data === 'string') return data
    if (data && typeof data === 'object' && (data as { kind?: string }).kind === 'RateLimited') {
      const retryAfter = (data as { retryAfter?: number }).retryAfter ?? 1000
      return `You’re going a little fast. Try again in ${Math.max(1, Math.ceil(retryAfter / 1000))}s.`
    }
  }
  return fallback
}

export function useCurrentUser() {
  const { isAuthenticated, isLoading } = useConvexAuth()
  const { user: clerkUser } = useUser()
  const store = useMutation(api.users.store)
  const me = useQuery(api.users.me, isAuthenticated ? {} : 'skip')
  const [error, setError] = useState<string | null>(null)
  const [lastMe, setLastMe] = useState<typeof me>(undefined)
  const name = clerkUser?.fullName || clerkUser?.username || clerkUser?.primaryEmailAddress?.emailAddress || undefined
  const imageUrl = clerkUser?.imageUrl

  useEffect(() => {
    if (me) setLastMe(me)
  }, [me])

  useEffect(() => {
    if (!isAuthenticated) return
    store({ name, imageUrl })
      .then(() => setError(null))
      .catch((reason: unknown) => setError(errorMessage(reason, 'We couldn’t load your profile.')))
  }, [isAuthenticated, name, imageUrl, store])

  const current = me ?? lastMe ?? null
  return {
    me: current,
    loading: !current && (isLoading || (isAuthenticated && !error)),
    isAuthenticated,
    reconnecting: Boolean(lastMe) && !isAuthenticated,
    error,
  }
}

function translationState(value: { status: string } | null): TranslationState {
  if (!value) return 'none'
  if (value.status === 'done') return 'done'
  if (value.status === 'pending') return 'pending'
  return 'unavailable'
}

export function toConversation(doc: ConversationDoc): Conversation {
  let preview = 'Say hello 👋'
  if (doc.lastMessagePreview) {
    if (doc.lastMessageFromMe) preview = `You: ${doc.lastMessagePreview}`
    else if (doc.kind === 'group' && doc.lastMessageSenderName) preview = `${firstNameOf(doc.lastMessageSenderName)}: ${doc.lastMessagePreview}`
    else preview = doc.lastMessagePreview
  }
  return {
    id: doc._id,
    name: doc.name,
    initials: initialsFor(doc.name),
    color: colorFor(doc._id),
    imageUrl: doc.imageUrl,
    pin: doc.other?.pin,
    online: doc.online,
    group: doc.kind === 'group',
    members: doc.members.map((member) => ({
      id: member._id,
      name: member.name,
      initials: initialsFor(member.name),
      color: colorFor(member._id),
      language: member.language,
      imageUrl: member.imageUrl ?? null,
    })),
    language: doc.other?.language ?? '',
    translationEnabled: doc.translationEnabled,
    muted: doc.muted,
    archived: doc.archived,
    blocked: doc.blockedByMe,
    blockedMe: doc.blockedMe,
    unread: doc.unreadCount,
    lastMessageAt: doc.lastMessageAt,
    lastReadAt: doc.lastReadAt,
    preview,
  }
}

export function toMessage(doc: MessageDoc, meId: string): Message {
  const mine = doc.senderId === meId
  return {
    id: doc._id,
    from: mine ? 'me' : 'them',
    author: doc.senderName,
    authorImage: doc.senderImage,
    text: doc.body,
    sourceLanguage: doc.sourceLanguage,
    translatedText: doc.translation?.text ?? undefined,
    translationState: translationState(doc.translation),
    outgoingTranslation: doc.outgoingTranslation?.text ?? undefined,
    outgoingState: translationState(doc.outgoingTranslation),
    createdAt: doc._creationTime,
    status: mine ? (optimisticIds.has(doc._id) ? 'sent' : doc.readByAll ? 'read' : 'delivered') : undefined,
    reactions: doc.reactions.map((reaction) => ({ emoji: reaction.emoji, by: reaction.userId === meId ? 'me' : 'them' })),
    reply: doc.reply
      ? { id: doc.reply._id, from: doc.reply.senderId === meId ? 'me' : 'them', author: doc.reply.senderName, summary: doc.reply.summary }
      : undefined,
    attachments: doc.attachments.map((attachment) => ({
      id: attachment.storageId,
      kind: attachment.kind,
      name: attachment.name,
      size: attachment.size,
      url: attachment.url ?? localPreviews.get(attachment.storageId) ?? null,
      duration: attachment.duration,
    })),
    edited: doc.edited,
    deleted: doc.deleted,
  }
}

export function useConversationLists(enabled: boolean) {
  const inbox = useQuery(api.conversations.listMine, enabled ? { archived: false } : 'skip')
  const archived = useQuery(api.conversations.listMine, enabled ? { archived: true } : 'skip')
  return useMemo(
    () => ({
      loaded: inbox !== undefined,
      inbox: (inbox ?? []).map(toConversation),
      archived: (archived ?? []).map(toConversation),
    }),
    [inbox, archived],
  )
}

export function useConversationMessages(conversationId: Id<'conversations'> | null, meId: string | null) {
  const { results, status, loadMore } = usePaginatedQuery(
    api.messages.list,
    conversationId ? { conversationId } : 'skip',
    { initialNumItems: PAGE_SIZE },
  )
  const messages = useMemo(() => (meId ? [...results].reverse().map((doc) => toMessage(doc, meId)) : []), [results, meId])
  return {
    messages,
    loading: status === 'LoadingFirstPage',
    loadingMore: status === 'LoadingMore',
    canLoadMore: status === 'CanLoadMore',
    loadMore: () => loadMore(PAGE_SIZE),
  }
}

function updateConversations(store: OptimisticLocalStore, update: (doc: ConversationDoc) => ConversationDoc | null) {
  for (const archived of [false, true]) {
    const current = store.getQuery(api.conversations.listMine, { archived })
    if (!current) continue
    const next = current.map(update).filter((doc): doc is ConversationDoc => doc !== null)
    store.setQuery(api.conversations.listMine, { archived }, next)
  }
}

function findMessage(store: OptimisticLocalStore, messageId: string) {
  for (const { value } of store.getAllQueries(api.messages.list)) {
    const found = value?.page.find((doc) => doc._id === messageId)
    if (found) return found
  }
  return null
}

function updateMessage(store: OptimisticLocalStore, messageId: string, update: (doc: MessageDoc) => MessageDoc) {
  const existing = findMessage(store, messageId)
  if (!existing) return
  optimisticallyUpdateValueInPaginatedQuery(store, api.messages.list, { conversationId: existing.conversationId }, (doc) =>
    doc._id === messageId ? update(doc) : doc,
  )
}

export function useChatActions() {
  const sendMutation = useMutation(api.messages.send)
  const reactMutation = useMutation(api.messages.react)
  const editMutation = useMutation(api.messages.edit)
  const removeMutation = useMutation(api.messages.remove)
  const restore = useMutation(api.messages.restore)
  const markReadMutation = useMutation(api.conversations.markRead)
  const setMutedMutation = useMutation(api.conversations.setMuted)
  const setArchivedMutation = useMutation(api.conversations.setArchived)
  const setTranslationMutation = useMutation(api.conversations.setTranslation)
  const block = useMutation(api.conversations.block)
  const unblock = useMutation(api.conversations.unblock)
  const startDirect = useMutation(api.conversations.startDirect)
  const createGroup = useMutation(api.conversations.createGroup)
  const addMembers = useMutation(api.conversations.addMembers)
  const leave = useMutation(api.conversations.leave)
  const setLanguage = useMutation(api.users.setLanguage)
  const generateUploadUrl = useMutation(api.files.generateUploadUrl)

  return useMemo(() => {
    const send = sendMutation.withOptimisticUpdate((store, args) => {
      const me = store.getQuery(api.users.me, {})
      if (!me) return
      const id = `optimistic-${uid()}` as Id<'messages'>
      optimisticIds.add(id)
      const replied = args.replyTo ? findMessage(store, args.replyTo) : null
      const body = args.body.trim()
      insertAtTop({
        paginatedQuery: api.messages.list,
        argsToMatch: { conversationId: args.conversationId },
        localQueryStore: store,
        item: {
          _id: id,
          _creationTime: Date.now(),
          conversationId: args.conversationId,
          senderId: me._id,
          senderName: me.name,
          senderImage: me.imageUrl ?? null,
          sourceLanguage: me.language,
          readByAll: false,
          body,
          deleted: false,
          edited: false,
          attachments: (args.attachments ?? []).map((attachment) => ({
            ...attachment,
            size: 0,
            url: localPreviews.get(attachment.storageId) ?? null,
          })),
          reactions: [],
          reply: replied ? { _id: replied._id, senderId: replied.senderId, senderName: replied.senderName, summary: replied.body || 'Attachment' } : null,
          translation: null,
          outgoingTranslation: null,
        },
      })
      const preview = body || (args.attachments?.[0]?.kind === 'audio' ? '🎤 Voice message' : args.attachments?.[0]?.kind === 'image' ? '📷 Photo' : '📎 Attachment')
      updateConversations(store, (doc) =>
        doc._id === args.conversationId ? { ...doc, lastMessagePreview: preview, lastMessageFromMe: true, lastMessageAt: Date.now() } : doc,
      )
    })

    const react = reactMutation.withOptimisticUpdate((store, args) => {
      const me = store.getQuery(api.users.me, {})
      if (!me) return
      updateMessage(store, args.messageId, (doc) => {
        const existing = doc.reactions.find((reaction) => reaction.userId === me._id)
        const others = doc.reactions.filter((reaction) => reaction.userId !== me._id)
        const reactions = existing?.emoji === args.emoji ? others : [...others, { emoji: args.emoji, userId: me._id }]
        return { ...doc, reactions }
      })
    })

    const edit = editMutation.withOptimisticUpdate((store, args) => {
      updateMessage(store, args.messageId, (doc) => ({ ...doc, body: args.body.trim(), edited: true, outgoingTranslation: null }))
    })

    const remove = removeMutation.withOptimisticUpdate((store, args) => {
      updateMessage(store, args.messageId, (doc) => ({ ...doc, deleted: true, body: '', attachments: [], reactions: [] }))
    })

    const markRead = markReadMutation.withOptimisticUpdate((store, args) => {
      updateConversations(store, (doc) => (doc._id === args.conversationId ? { ...doc, unreadCount: 0, lastReadAt: Date.now() } : doc))
    })

    const setMuted = setMutedMutation.withOptimisticUpdate((store, args) => {
      updateConversations(store, (doc) => (doc._id === args.conversationId ? { ...doc, muted: args.muted } : doc))
    })

    const setTranslation = setTranslationMutation.withOptimisticUpdate((store, args) => {
      updateConversations(store, (doc) => (doc._id === args.conversationId ? { ...doc, translationEnabled: args.enabled } : doc))
    })

    const setArchived = setArchivedMutation.withOptimisticUpdate((store, args) => {
      const source = store.getQuery(api.conversations.listMine, { archived: !args.archived })
      const target = store.getQuery(api.conversations.listMine, { archived: args.archived })
      const moving = source?.find((doc) => doc._id === args.conversationId)
      if (!source || !moving) return
      store.setQuery(api.conversations.listMine, { archived: !args.archived }, source.filter((doc) => doc._id !== args.conversationId))
      if (target) {
        const next = [...target, { ...moving, archived: args.archived }].sort((a, b) => b.lastMessageAt - a.lastMessageAt)
        store.setQuery(api.conversations.listMine, { archived: args.archived }, next)
      }
    })

    return {
      send,
      react,
      edit,
      remove,
      restore,
      markRead,
      setMuted,
      setArchived,
      setTranslation,
      block,
      unblock,
      startDirect,
      createGroup,
      addMembers,
      leave,
      setLanguage,
      generateUploadUrl,
    }
  }, [
    sendMutation,
    reactMutation,
    editMutation,
    removeMutation,
    restore,
    markReadMutation,
    setMutedMutation,
    setArchivedMutation,
    setTranslationMutation,
    block,
    unblock,
    startDirect,
    createGroup,
    addMembers,
    leave,
    setLanguage,
    generateUploadUrl,
  ])
}

export type ChatActions = ReturnType<typeof useChatActions>
