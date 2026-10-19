'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAction, useConvexConnectionState, useMutation, useQuery } from 'convex/react'
import { Ban, ChevronDown, ChevronUp, Globe2, Search, WifiOff, X } from 'lucide-react'
import { api } from '@/convex/_generated/api'
import type { Id } from '@/convex/_generated/dataModel'
import {
  errorCode,
  errorMessage,
  rememberPreview,
  useChatActions,
  useConversationLists,
  useConversationMessages,
  useCurrentUser,
} from '@/hooks/use-convex-chat'
import { useCallActions, useCallInChat, useIncomingCalls, type CallKind, type CurrentCall, type IncomingCall } from '@/hooks/use-calls'
import { useSoundPreference } from '@/hooks/use-sound-preference'
import { useStableCallback, useStableHandlers } from '@/hooks/use-stable-callback'
import { useViewportHeight } from '@/hooks/use-viewport-height'
import { useWebPush } from '@/hooks/use-web-push'
import { downloadAttachment } from '@/lib/download'
import { getDraft, setDraft } from '@/lib/draft-store'
import type { InviteTarget } from '@/lib/invite'
import { scrollBehavior } from '@/lib/motion'
import { isAudioUnlocked, listenForAudioUnlock, playChime, previewChime, subscribeAudioUnlock } from '@/lib/sounds'
import type { Attachment, Conversation, Member, Message } from '@/lib/chat-data'
import { firstName } from '@/lib/chat-format'
import { languages, speak } from '@/lib/speech'
import { AlertDialog, type AlertContent } from './alert-dialog'
import type { CallEndReason } from './call-screen'
import { ConfirmDialog, MediaDialog, type ConfirmRequest } from './chat-dialogs'
import { Composer, type ComposerContext, type OutgoingAttachment } from './composer'
import { ConversationHeader } from './conversation-header'
import { DetailsPanel } from './details-panel'
import type { MemberAction } from './group-members'
import { IncomingCallBanner } from './incoming-call'
import type { InviteTab } from './invite-dialog'
import type { MessageActions } from './message-bubble'
import { MessageList } from './message-list'
import { NewChatDialog } from './new-chat-dialog'
import { ChatHome } from './chat-home'
import { ForwardDialog } from './forward-dialog'
import { PinnedBar } from './pinned-bar'
import { PresenceBeacon } from './presence-beacon'
import { Sidebar } from './sidebar'
import { ToastRegion, useToasts } from './toasts'

type ChatSearch = { open: boolean; query: string; index: number }

const TYPING_IDLE_MS = 3500

const CallScreen = dynamic(() => import('./call-screen'), { ssr: false })
const InviteDialog = dynamic(() => import('./invite-dialog').then((module) => module.InviteDialog), { ssr: false })

function isOptimistic(id: string) {
  return id.startsWith('optimistic-')
}

function useBrowserOnline() {
  const [online, setOnline] = useState(() => typeof navigator === 'undefined' || navigator.onLine)
  useEffect(() => {
    const update = () => setOnline(navigator.onLine)
    window.addEventListener('online', update)
    window.addEventListener('offline', update)
    return () => {
      window.removeEventListener('online', update)
      window.removeEventListener('offline', update)
    }
  }, [])
  return online
}

function usePageVisible() {
  const [visible, setVisible] = useState(() => typeof document === 'undefined' || document.visibilityState === 'visible')
  useEffect(() => {
    const update = () => setVisible(document.visibilityState === 'visible')
    document.addEventListener('visibilitychange', update)
    return () => document.removeEventListener('visibilitychange', update)
  }, [])
  return visible
}

export default function ChatApp() {
  const { me, loading: userLoading, error: userError, isAuthenticated, reconnecting } = useCurrentUser()
  const lists = useConversationLists(Boolean(me))
  const actions = useChatActions()
  const router = useRouter()
  const searchParams = useSearchParams()
  const connection = useConvexConnectionState()
  const visible = usePageVisible()
  const browserOnline = useBrowserOnline()
  const push = useWebPush(Boolean(me))
  const { soundOn, setSoundOn } = useSoundPreference()
  const [audioUnlocked, setAudioUnlocked] = useState(isAudioUnlocked)
  const lockedHintShown = useRef(false)
  const lastActiveChat = useRef<Conversation | null>(null)
  const leavingId = useRef<string | null>(null)
  const { toasts, show, dismiss } = useToasts()

  const [activeId, setActiveId] = useState<string | null>(null)
  const [view, setView] = useState<'inbox' | 'archived'>('inbox')
  const [query, setQuery] = useState('')
  const [mobileList, setMobileList] = useState(false)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [context, setContext] = useState<{ type: 'reply' | 'edit'; messageId: string } | null>(null)
  const [chatSearch, setChatSearch] = useState<ChatSearch>({ open: false, query: '', index: 0 })
  const [newChat, setNewChat] = useState<{ open: boolean; tab: 'direct' | 'group' }>({ open: false, tab: 'direct' })
  const pendingJump = useRef<{ conversationId: string; messageId: string } | null>(null)
  const [invite, setInvite] = useState<{ open: boolean; tab: InviteTab }>({ open: false, tab: 'share' })
  const [currentCall, setCurrentCall] = useState<CurrentCall | null>(null)
  const [callMinimized, setCallMinimized] = useState(false)
  const callActions = useCallActions()
  const incomingCalls = useIncomingCalls(Boolean(me))
  const ringingCall = incomingCalls.find((call) => call.callId !== currentCall?.callId) ?? null
  const [confirm, setConfirm] = useState<ConfirmRequest | null>(null)
  const [alert, setAlert] = useState<AlertContent | null>(null)
  const [mediaState, setMediaState] = useState<{ open: boolean; focusId?: string }>({ open: false })
  const [typing, setTyping] = useState(false)
  const [bannerExpanded, setBannerExpanded] = useState(false)
  const [forwarding, setForwarding] = useState<Message | null>(null)
  const setPinned = useMutation(api.messages.setPinned)
  const dismissPreview = useMutation(api.messages.dismissPreview)
  const forward = useAction(api.messages.forward)
  useViewportHeight()

  const sidebarSearchRef = useRef<HTMLInputElement>(null)
  const chatSearchRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const typingTimer = useRef<number | null>(null)
  const markedRead = useRef<string | null>(null)
  const linkHandled = useRef(false)
  const previousUnread = useRef<Map<string, number> | null>(null)

  const allChats = useMemo(() => [...lists.inbox, ...lists.archived], [lists])
  const activeChat = allChats.find((chat) => chat.id === activeId) ?? null
  const conversationId = activeChat ? (activeChat.id as Id<'conversations'>) : null
  const chatName = activeChat ? (activeChat.group ? activeChat.name : firstName(activeChat.name)) : ''
  const myLanguage = me?.language ?? 'English'

  const { messages, loading: messagesLoading, loadingMore, canLoadMore, loadMore } = useConversationMessages(conversationId, me?._id ?? null, myLanguage, activeChat?.translationEnabled ?? false)
  const typists = useQuery(api.presence.typing, conversationId ? { conversationId } : 'skip')
  const typingAuthor = typists?.[0]?.name
  const callHere = useCallInChat(conversationId) ?? null
  const inCallHere = Boolean(currentCall && currentCall.conversationId === conversationId)

  const selectChat = useCallback((id: string) => {
    setActiveId(id)
    setMobileList(false)
    setContext(null)
    setTyping(false)
    setChatSearch({ open: false, query: '', index: 0 })
  }, [])

  useEffect(() => {
    if (activeChat) lastActiveChat.current = activeChat
  }, [activeChat])

  useEffect(() => {
    if (!activeId || !lists.loaded || allChats.some((chat) => chat.id === activeId)) return
    const lost = lastActiveChat.current
    if (lost?.id === activeId && lost.group && leavingId.current !== activeId) {
      setAlert({ title: `You’re no longer in ${lost.name}`, message: 'A group admin removed you, so you can’t see new messages or reply in this group.' })
    }
    setActiveId(null)
  }, [activeId, allChats, lists.loaded])

  const latest = messages[messages.length - 1]
  useEffect(() => {
    if (!activeChat || !conversationId || !visible || !latest || isOptimistic(latest.id)) return
    if (activeChat.unread === 0 && latest.createdAt <= activeChat.lastReadAt) return
    if (markedRead.current === latest.id) return
    markedRead.current = latest.id
    actions.markRead({ conversationId }).catch(() => {
      markedRead.current = null
    })
  }, [activeChat, conversationId, visible, latest, actions])

  useEffect(() => {
    if (!lists.loaded) return
    const next = new Map(lists.inbox.map((chat) => [chat.id, chat.unread]))
    const before = previousUnread.current
    previousUnread.current = next
    if (!before) return
    for (const chat of lists.inbox) {
      const grew = chat.unread > (before.get(chat.id) ?? 0)
      if (grew && !chat.muted && (chat.id !== activeId || !visible)) {
        show(`${chat.name}: ${chat.preview}`, { label: 'Open', onClick: () => selectChat(chat.id) })
        // While hidden with push on, the system notification already makes a sound.
        const pushPlaysSound = !visible && push.status === 'enabled'
        if (soundOn && !pushPlaysSound && playChime() === 'locked' && !lockedHintShown.current) {
          lockedHintShown.current = true
          show('Tap anywhere to turn on message sounds')
        }
      }
    }
  }, [lists, activeId, visible, show, selectChat, soundOn, push.status])

  useEffect(() => {
    listenForAudioUnlock()
    return subscribeAudioUnlock(() => setAudioUnlocked(true))
  }, [])

  useEffect(() => () => {
    if (typingTimer.current) window.clearTimeout(typingTimer.current)
  }, [])

  const composerContext: ComposerContext = useMemo(() => {
    if (!context) return null
    const message = messages.find((item) => item.id === context.messageId && !item.deleted)
    return message ? { type: context.type, message } : null
  }, [context, messages])

  const media = useMemo<Attachment[]>(() => messages.filter((message) => !message.deleted).flatMap((message) => message.attachments), [messages])

  const localMatches = useMemo(() => {
    const needle = chatSearch.query.trim().toLowerCase()
    if (!chatSearch.open || !needle) return []
    return messages
      .filter((message) => !message.deleted && `${message.text} ${message.translatedText ?? ''} ${message.outgoingTranslation ?? ''}`.toLowerCase().includes(needle))
      .map((message) => message.id)
  }, [messages, chatSearch])
  const serverMatches = useQuery(
    api.messages.search,
    chatSearch.open && conversationId && chatSearch.query.trim().length >= 2 ? { conversationId, text: chatSearch.query } : 'skip',
  )
  const loadedIds = useMemo(() => new Set(messages.map((message) => message.id)), [messages])
  const olderMatches = (serverMatches ?? []).filter((match) => !loadedIds.has(match._id)).length
  const matchOffset = localMatches.length ? chatSearch.index % localMatches.length : 0
  const currentMatchId = localMatches.length ? localMatches[localMatches.length - 1 - matchOffset] : undefined

  function handleTyping() {
    setTyping(true)
    if (typingTimer.current) window.clearTimeout(typingTimer.current)
    typingTimer.current = window.setTimeout(() => setTyping(false), TYPING_IDLE_MS)
  }

  async function downloadFile(attachment: Attachment) {
    if (!attachment.url) return
    const result = await downloadAttachment(attachment.url, attachment.name)
    if (result === 'opened') show(`${attachment.name} opened in a new tab. Save it from there.`)
  }

  function showBlockedAlert() {
    setAlert({
      title: 'Message not sent',
      message: `You can’t send messages to ${chatName} right now. Your message is still in the box.`,
    })
  }

  async function handleSend({ text, attachments }: { text: string; attachments: OutgoingAttachment[] }) {
    if (!activeChat || !conversationId) return false
    setTyping(false)
    try {
      if (composerContext?.type === 'edit') {
        await actions.edit({ messageId: composerContext.message.id as Id<'messages'>, body: text })
        setContext(null)
        return true
      }
      if (activeChat.blockedMe) {
        showBlockedAlert()
        return false
      }
      attachments.forEach((attachment) => rememberPreview(attachment.storageId, attachment.previewUrl))
      const replyTo = composerContext?.type === 'reply' && !isOptimistic(composerContext.message.id) ? (composerContext.message.id as Id<'messages'>) : undefined
      setContext(null)
      setDraft(activeChat.id, '')
      await actions.send({
        conversationId,
        body: text,
        replyTo,
        attachments: attachments.length
          ? attachments.map((attachment) => ({ storageId: attachment.storageId as Id<'_storage'>, kind: attachment.kind, name: attachment.name, duration: attachment.duration }))
          : undefined,
      })
      return true
    } catch (error) {
      const code = errorCode(error)
      if (code === 'blocked') showBlockedAlert()
      else if (code === 'not_member') {
        setAlert({ title: 'Message not sent', message: 'You’re no longer part of this conversation, so your message couldn’t be delivered.' })
      } else show(errorMessage(error, 'Your message didn’t send. It’s back in the box so you can try again.'))
      return false
    }
  }

  function editLastMessage() {
    const last = messages.filter((message) => message.from === 'me' && !message.deleted && message.text && !isOptimistic(message.id)).at(-1)
    if (last) setContext({ type: 'edit', messageId: last.id })
  }

  const messageActions = useStableHandlers<MessageActions>({
    onReply: (message) => setContext({ type: 'reply', messageId: message.id }),
    onReact: (message, emoji) => {
      if (isOptimistic(message.id)) return
      actions.react({ messageId: message.id as Id<'messages'>, emoji }).catch((error) => show(errorMessage(error)))
    },
    onCopy: async (text) => {
      try {
        await navigator.clipboard.writeText(text)
        show('Copied to clipboard')
      } catch {
        show('Couldn’t copy. Select the text instead.')
      }
    },
    onEdit: (message) => !isOptimistic(message.id) && setContext({ type: 'edit', messageId: message.id }),
    onDelete: (message) => {
      if (isOptimistic(message.id)) return
      const messageId = message.id as Id<'messages'>
      if (context?.messageId === message.id) setContext(null)
      actions
        .remove({ messageId })
        .then(() =>
          show('Message deleted', {
            label: 'Undo',
            onClick: () => actions.restore({ messageId }).catch((error) => show(errorMessage(error))),
          }),
        )
        .catch((error) => show(errorMessage(error)))
    },
    onListen: (text, language) => {
      if (!speak(text, language)) show('Read-aloud isn’t available in this browser.')
    },
    onOpenMedia: (attachment) => setMediaState({ open: true, focusId: attachment.id }),
    onDownload: (attachment) => void downloadFile(attachment),
    onCallBack: (kind) => void startCall(kind),
    onPin: (message) => {
      if (isOptimistic(message.id)) return
      run(setPinned({ messageId: message.id as Id<'messages'>, pinned: !message.pinned }), message.pinned ? 'Message unpinned' : 'Pinned to the top of the chat')
    },
    onForward: (message) => !isOptimistic(message.id) && setForwarding(message),
    onDismissPreview: (message) => {
      if (isOptimistic(message.id)) return
      run(dismissPreview({ messageId: message.id as Id<'messages'> }))
    },
    onJumpTo: (messageId) => {
      const element = document.getElementById(`msg-${messageId}`)
      if (!element) {
        show('That message is further back. Scroll up to load earlier messages.')
        return
      }
      element.scrollIntoView({ block: 'center', behavior: scrollBehavior() })
      element.classList.add('is-flash')
      window.setTimeout(() => element.classList.remove('is-flash'), 1400)
    },
  })

  useEffect(() => {
    const jump = pendingJump.current
    if (!jump || jump.conversationId !== activeId || messagesLoading) return
    pendingJump.current = null
    const frame = window.requestAnimationFrame(() => messageActions.onJumpTo(jump.messageId))
    return () => window.cancelAnimationFrame(frame)
  }, [activeId, messages, messagesLoading, messageActions])

  useEffect(() => {
    const jump = pendingJump.current
    if (!jump || jump.conversationId !== activeId || messagesLoading) return
    pendingJump.current = null
    const frame = window.requestAnimationFrame(() => messageActions.onJumpTo(jump.messageId))
    return () => window.cancelAnimationFrame(frame)
  }, [activeId, messages, messagesLoading, messageActions])

  function run(promise: Promise<unknown>, success?: string) {
    promise.then(() => success && show(success)).catch((error) => show(errorMessage(error)))
  }

  function toggleMute(chat: Conversation) {
    run(actions.setMuted({ conversationId: chat.id as Id<'conversations'>, muted: !chat.muted }), chat.muted ? `Notifications are back on for ${chat.name}` : `Notifications muted for ${chat.name}`)
  }

  function toggleArchive(chat: Conversation) {
    const id = chat.id as Id<'conversations'>
    const archived = !chat.archived
    actions
      .setArchived({ conversationId: id, archived })
      .then(() =>
        show(archived ? `${chat.name} archived` : `${chat.name} moved to messages`, {
          label: 'Undo',
          onClick: () => run(actions.setArchived({ conversationId: id, archived: !archived })),
        }),
      )
      .catch((error) => show(errorMessage(error)))
  }

  function requestBlock(chat: Conversation) {
    if (chat.blocked) run(actions.unblock({ conversationId: chat.id as Id<'conversations'> }), `${firstName(chat.name)} unblocked`)
    else setConfirm({ kind: 'block', chat })
  }

  function confirmAction(request: ConfirmRequest) {
    const id = request.chat.id as Id<'conversations'>
    setConfirm(null)
    if (request.kind === 'block') {
      run(actions.block({ conversationId: id }), `${firstName(request.chat.name)} blocked`)
    } else if (request.kind === 'remove') {
      run(actions.removeMember({ conversationId: id, userId: request.member.id as Id<'users'> }), `${request.member.name} was removed`)
    } else if (request.kind === 'ban') {
      run(actions.banMember({ conversationId: id, userId: request.member.id as Id<'users'> }), `${request.member.name} was banned from ${request.chat.name}`)
    } else {
      leavingId.current = request.chat.id
      actions
        .leave({ conversationId: id })
        .then(() => {
          show(`You left ${request.chat.name}`)
          setActiveId(null)
        })
        .catch((error) => {
          leavingId.current = null
          show(errorMessage(error))
        })
    }
  }

  function memberAction(action: MemberAction, member: Member) {
    if (!activeChat) return
    const conversationId = activeChat.id as Id<'conversations'>
    const userId = member.id as Id<'users'>
    if (action === 'make_admin') run(actions.setRole({ conversationId, userId, role: 'admin' }), `${member.name} is now an admin`)
    else if (action === 'remove_admin') run(actions.setRole({ conversationId, userId, role: 'member' }), `${member.name} is no longer an admin`)
    else setConfirm({ kind: action, chat: activeChat, member })
  }

  function unban(userId: string, name: string) {
    if (!activeChat) return
    run(actions.unbanMember({ conversationId: activeChat.id as Id<'conversations'>, userId: userId as Id<'users'> }), `${name} can be added back now`)
  }

  async function startDirect(pin: string) {
    try {
      const id = await actions.startDirect({ pin })
      setView('inbox')
      setQuery('')
      selectChat(id)
      return true
    } catch (error) {
      show(errorMessage(error))
      return false
    }
  }

  async function createGroup(name: string, pins: string[]) {
    try {
      const id = await actions.createGroup({ name, pins })
      setView('inbox')
      selectChat(id)
      show(`${name} is ready`)
      return true
    } catch (error) {
      show(errorMessage(error))
      return false
    }
  }

  async function addMember(pin: string) {
    if (!conversationId) return false
    try {
      const added = await actions.addMembers({ conversationId, pins: [pin] })
      show(added ? 'Added to the group' : 'They’re already in this group')
      return true
    } catch (error) {
      show(errorMessage(error))
      return false
    }
  }

  function setMyLanguage(language: string) {
    run(actions.setLanguage({ language }), `New messages will be translated into ${language}`)
  }

  function toggleTranslation(chat: Conversation) {
    run(actions.setTranslation({ conversationId: chat.id as Id<'conversations'>, enabled: !chat.translationEnabled }))
  }

  async function copyPin() {
    if (!me) return
    try {
      await navigator.clipboard.writeText(me.pin)
      show(`Your PIN ${me.pin} was copied`)
    } catch {
      show(`Your PIN is ${me.pin}`)
    }
  }

  async function forwardMessage(message: Message, conversationIds: string[]) {
    try {
      const count = await forward({ messageId: message.id as Id<'messages'>, conversationIds: conversationIds as Id<'conversations'>[] })
      show(count === 1 ? 'Message forwarded' : `Forwarded to ${count} chats`)
      return true
    } catch (error) {
      show(errorMessage(error))
      return false
    }
  }

  function showBlockedCallAlert() {
    setAlert({ title: 'You can’t call this person', message: 'Calls and messages are turned off in this chat because one of you blocked the other.' })
  }

  function callError(error: unknown) {
    const code = errorCode(error)
    if (code === 'blocked') showBlockedCallAlert()
    else if (code === 'calls_unconfigured') {
      setAlert({ title: 'Calls aren’t set up yet', message: 'Voice and video calls need a LiveKit connection on the server. Ask the app owner to add it, then try again.' })
    } else show(errorMessage(error))
  }

  async function startCall(kind: CallKind) {
    if (!activeChat || !conversationId) return
    if (currentCall) {
      if (currentCall.conversationId === conversationId) setCallMinimized(false)
      else show('You’re already on a call. Hang up first.')
      return
    }
    if (activeChat.blocked || activeChat.blockedMe) {
      showBlockedCallAlert()
      return
    }
    try {
      const result = await callActions.start({ conversationId, kind })
      setCallMinimized(false)
      setCurrentCall({ ...result, conversationId, chatName: activeChat.name })
    } catch (error) {
      callError(error)
    }
  }

  async function acceptCall(call: IncomingCall) {
    if (currentCall) await callActions.leave({ callId: currentCall.callId }).catch(() => undefined)
    try {
      const result = await callActions.join({ callId: call.callId })
      setCallMinimized(false)
      setCurrentCall({ ...result, conversationId: call.conversationId, chatName: call.chatName })
      setView('inbox')
      selectChat(call.conversationId)
    } catch (error) {
      callError(error)
    }
  }

  function declineCall(call: IncomingCall) {
    callActions.decline({ callId: call.callId }).catch((error) => show(errorMessage(error)))
  }

  function callEnded(callId: string, reason: CallEndReason, message?: string) {
    setCurrentCall((current) => (current?.callId === callId ? null : current))
    if (reason === 'ended') show('Call ended')
    else if (message) show(message)
  }

  function openNewChat(tab: 'direct' | 'group') {
    setMobileList(false)
    setNewChat({ open: true, tab })
  }

  function goHome() {
    setActiveId(null)
    setMobileList(false)
    setDetailsOpen(false)
    setContext(null)
    setChatSearch({ open: false, query: '', index: 0 })
  }

  function showInstallHelp() {
    setAlert({
      title: 'Add afjini to your Home Screen',
      message: 'In Safari, tap the Share button, then choose “Add to Home Screen”. afjini will open full screen like an app, and you can turn on notifications from there.',
    })
  }

  function openInvite(tab: InviteTab) {
    setMobileList(false)
    setInvite({ open: true, tab })
  }

  function handleScan(target: InviteTarget) {
    setInvite((current) => ({ ...current, open: false }))
    if (target.kind === 'pin') {
      if (target.pin === me?.pin) show('That’s your own PIN.')
      else void startDirect(target.pin)
    } else router.push(`/invite/${target.code}`)
  }

  function openChatSearch() {
    setChatSearch({ open: true, query: '', index: 0 })
    setDetailsOpen(false)
    window.requestAnimationFrame(() => chatSearchRef.current?.focus())
  }

  function stepMatch(direction: 1 | -1) {
    if (!localMatches.length) return
    setChatSearch((current) => ({ ...current, index: (current.index + direction + localMatches.length) % localMatches.length }))
  }

  async function enablePush() {
    const ok = await push.enable()
    show(ok ? 'Notifications are on for this browser' : 'Notifications weren’t turned on')
  }

  async function disablePush() {
    await push.disable()
    show('Notifications are off for this browser')
  }

  const openDeepLink = useStableCallback((pin: string | null, conversation: string | null) => {
    if (pin) void startDirect(pin)
    else if (conversation) selectChat(conversation)
    router.replace('/chat', { scroll: false })
  })

  useEffect(() => {
    if (!me || linkHandled.current) return
    const pin = searchParams.get('pin')
    const conversation = searchParams.get('c')
    if (!pin && !conversation) return
    linkHandled.current = true
    openDeepLink(pin, conversation)
  }, [me, searchParams, openDeepLink])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        if (window.matchMedia('(max-width: 900px)').matches) {
          setDetailsOpen(false)
          setMobileList(true)
        }
        sidebarSearchRef.current?.focus()
        sidebarSearchRef.current?.select()
        return
      }
      if (event.key !== 'Escape' || document.querySelector('dialog[open]')) return
      if (chatSearch.open) setChatSearch({ open: false, query: '', index: 0 })
      else if (mobileList || detailsOpen) {
        setMobileList(false)
        setDetailsOpen(false)
      } else if (document.activeElement === sidebarSearchRef.current && query) setQuery('')
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [chatSearch.open, mobileList, detailsOpen, query])

  if (userError) {
    return (
      <main className="app-shell chat-loading">
        <div className="chat-loading-card is-error">
          <strong>We couldn’t load your profile</strong>
          <span>{userError}</span>
          <button type="button" onClick={() => window.location.reload()}>Try again</button>
        </div>
      </main>
    )
  }

  if (userLoading || !me) {
    return (
      <main className="app-shell chat-loading" aria-busy="true">
        <div className="chat-loading-card">
          <div className="brand-mark">A</div>
          <span>Connecting securely…</span>
        </div>
      </main>
    )
  }

  const conversations = view === 'archived' ? lists.archived : lists.inbox
  const unreadChats = lists.inbox.filter((chat) => chat.unread > 0 && !chat.muted && !chat.blocked)
  const focusedMedia = media.find((item) => item.id === mediaState.focusId)
  const offline = !browserOnline || reconnecting || (connection.hasEverConnected && !connection.isWebSocketConnected)

  return (
    <main className={`app-shell ${activeChat ? 'in-conversation' : 'no-details'}`}>
      {activeChat && <a className="skip-link" href="#messages">Skip to messages</a>}
      {isAuthenticated && <PresenceBeacon roomId={`user:${me._id}`} userId={me._id} />}
      {isAuthenticated && conversationId && visible && <PresenceBeacon key={`conv-${conversationId}`} roomId={`conv:${conversationId}`} userId={me._id} />}
      {isAuthenticated && conversationId && typing && <PresenceBeacon key={`typing-${conversationId}`} roomId={`typing:${conversationId}`} userId={me._id} />}

      <div
        className={`chat-backdrop ${mobileList || detailsOpen ? 'is-visible' : ''}`}
        aria-hidden
        onClick={() => {
          setMobileList(false)
          setDetailsOpen(false)
        }}
      />

      <Sidebar
        conversations={conversations}
        unreadChats={unreadChats}
        archivedCount={lists.archived.length}
        loading={!lists.loaded}
        activeId={activeId}
        typingIn={typingAuthor && activeChat ? activeChat.id : null}
        myName={me.name}
        myLanguage={myLanguage}
        myPin={me.pin}
        view={view}
        query={query}
        searchRef={sidebarSearchRef}
        mobileVisible={mobileList}
        pushStatus={push.status}
        soundOn={soundOn}
        soundLocked={soundOn && !audioUnlocked}
        onToggleSound={() => {
          if (soundOn && !audioUnlocked) {
            void previewChime()
            return
          }
          setSoundOn(!soundOn)
          if (!soundOn) void previewChime()
        }}
        onViewChange={setView}
        onQueryChange={setQuery}
        onSelect={selectChat}
        onNewChat={() => openNewChat('direct')}
        onHome={goHome}
        onClose={() => setMobileList(false)}
        onCopyPin={copyPin}
        onOpenInvite={() => openInvite('share')}
        onScanQr={() => openInvite('scan')}
        onInstallHelp={showInstallHelp}
        onEnablePush={() => void enablePush()}
        onDisablePush={() => void disablePush()}
      />

      <section className="conversation-panel">
        {offline && (
          <div className="connection-banner" role="status">
            <WifiOff /> Reconnecting… messages you send will go out as soon as you’re back online.
          </div>
        )}
        {activeChat && conversationId ? (
          <>
            <ConversationHeader
              chat={activeChat}
              typingAuthor={typingAuthor}
              onOpenList={() => {
                setMobileList(true)
                setDetailsOpen(false)
              }}
              onOpenDetails={() => {
                setDetailsOpen(true)
                setMobileList(false)
              }}
              call={callHere}
              inCall={inCallHere}
              onCall={(kind) => void startCall(kind)}
              onSearch={openChatSearch}
              onToggleMute={() => toggleMute(activeChat)}
              onToggleArchive={() => toggleArchive(activeChat)}
              onBlock={() => requestBlock(activeChat)}
              onLeave={() => setConfirm({ kind: 'leave', chat: activeChat })}
            />

            <PinnedBar conversationId={conversationId} onJump={messageActions.onJumpTo} />

            {chatSearch.open && (
              <div className="chat-search-bar" role="search">
                <Search />
                <input
                  ref={chatSearchRef}
                  value={chatSearch.query}
                  placeholder={`Search messages with ${chatName}`}
                  aria-label="Search in this conversation"
                  onChange={(event) => setChatSearch({ open: true, query: event.target.value, index: 0 })}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault()
                      stepMatch(event.shiftKey ? -1 : 1)
                    }
                  }}
                />
                <span className="chat-search-count" aria-live="polite">
                  {chatSearch.query.trim()
                    ? localMatches.length
                      ? `${localMatches.length - matchOffset} of ${localMatches.length}`
                      : olderMatches ? 'Not in loaded messages' : 'No matches'
                    : ''}
                </span>
                {olderMatches > 0 && canLoadMore && (
                  <button type="button" className="search-older" onClick={loadMore}>+{olderMatches} earlier</button>
                )}
                <button type="button" className="icon-button" aria-label="Older match" onClick={() => stepMatch(1)} disabled={!localMatches.length}><ChevronUp /></button>
                <button type="button" className="icon-button" aria-label="Newer match" onClick={() => stepMatch(-1)} disabled={!localMatches.length}><ChevronDown /></button>
                <button type="button" className="icon-button" aria-label="Close search" onClick={() => setChatSearch({ open: false, query: '', index: 0 })}><X /></button>
              </div>
            )}

            <div className={`translation-banner ${activeChat.translationEnabled ? '' : 'is-paused'} ${bannerExpanded ? 'is-expanded' : ''}`}>
              <button
                type="button"
                className="translation-icon translation-toggle"
                aria-expanded={bannerExpanded}
                aria-label={bannerExpanded ? 'Hide translation details' : 'Show translation details'}
                onClick={() => setBannerExpanded((value) => !value)}
              >
                <Globe2 />
              </button>
              <div>
                <strong>{activeChat.translationEnabled ? 'Automatic translation is on' : 'Automatic translation is paused'}</strong>
                {activeChat.group ? (
                  <span>You read and write in <b>{myLanguage}</b> · everyone else reads in their own language</span>
                ) : (
                  <span>You read and write in <b>{myLanguage}</b> · {chatName} reads in <b>{activeChat.language || '…'}</b></span>
                )}
              </div>
              <button type="button" className="banner-toggle" aria-pressed={activeChat.translationEnabled} onClick={() => toggleTranslation(activeChat)}>
                {activeChat.translationEnabled ? 'Pause' : 'Turn on'}
              </button>
              <label className="language-button" aria-label="Choose your language">
                <select value={myLanguage} onChange={(event) => setMyLanguage(event.target.value)}>
                  {languages.map((language) => <option key={language}>{language}</option>)}
                </select>
                <ChevronDown />
              </label>
            </div>

            <MessageList
              chat={activeChat}
              messages={messages}
              myLanguage={myLanguage}
              loading={messagesLoading}
              loadingMore={loadingMore}
              canLoadMore={canLoadMore}
              onLoadMore={loadMore}
              typingAuthor={typingAuthor}
              highlight={chatSearch.open ? chatSearch.query : ''}
              currentMatchId={currentMatchId}
              actions={messageActions}
            />

            {activeChat.blocked ? (
              <div className="blocked-notice">
                <Ban />
                <span>You blocked {chatName}. Unblock to send and receive messages.</span>
                <button type="button" onClick={() => requestBlock(activeChat)}>Unblock</button>
              </div>
            ) : (
              <Composer
                key={activeChat.id}
                chat={activeChat}
                myLanguage={myLanguage}
                initialDraft={getDraft(activeChat.id)}
                context={composerContext}
                textareaRef={textareaRef}
                getUploadUrl={() => actions.generateUploadUrl()}
                onDraftChange={(text) => setDraft(activeChat.id, text)}
                onCancelContext={() => setContext(null)}
                onSend={handleSend}
                onTyping={handleTyping}
                onEditLast={editLastMessage}
                notify={show}
              />
            )}
          </>
        ) : (
          <ChatHome
            me={me}
            myLanguage={myLanguage}
            inbox={lists.inbox}
            hasChats={lists.inbox.length + lists.archived.length > 0}
            unreadChats={unreadChats}
            typingIn={null}
            pushStatus={push.status}
            onSelectChat={selectChat}
            onOpenPin={(chatId, messageId) => {
              pendingJump.current = { conversationId: chatId, messageId }
              setView('inbox')
              selectChat(chatId)
            }}
            onNewChat={openNewChat}
            onInvite={openInvite}
            onEnablePush={() => void enablePush()}
            onCopyPin={copyPin}
            onSetLanguage={setMyLanguage}
            onInstallHelp={showInstallHelp}
            onOpenList={() => setMobileList(true)}
          />
        )}
      </section>

      {activeChat && (
        <DetailsPanel
          chat={activeChat}
          myLanguage={myLanguage}
          open={detailsOpen}
          media={media}
          onClose={() => setDetailsOpen(false)}
          call={callHere}
          inCall={inCallHere}
          onCall={(kind) => void startCall(kind)}
          onSearch={openChatSearch}
          onToggleTranslation={() => toggleTranslation(activeChat)}
          onSetMyLanguage={setMyLanguage}
          onToggleMute={() => toggleMute(activeChat)}
          onToggleArchive={() => toggleArchive(activeChat)}
          onBlock={() => requestBlock(activeChat)}
          onLeave={() => setConfirm({ kind: 'leave', chat: activeChat })}
          onAddMember={addMember}
          onMemberAction={memberAction}
          onUnban={unban}
          onOpenMedia={(attachment) => setMediaState({ open: true, focusId: attachment?.id })}
          onJumpToMessage={(messageId) => {
            setDetailsOpen(false)
            messageActions.onJumpTo(messageId)
          }}
          onUnpin={(messageId) => run(setPinned({ messageId: messageId as Id<'messages'>, pinned: false }), 'Message unpinned')}
          notify={show}
        />
      )}

      <NewChatDialog
        open={newChat.open}
        initialTab={newChat.tab}
        onClose={() => setNewChat((current) => ({ ...current, open: false }))}
        onStartDirect={startDirect}
        onCreateGroup={createGroup}
        onScanQr={() => openInvite('scan')}
        onOpenInvite={(code) => router.push(`/invite/${code}`)}
      />
      {invite.open && <InviteDialog
        open={invite.open}
        tab={invite.tab}
        myName={me.name}
        myPin={me.pin}
        onTabChange={(tab) => setInvite({ open: true, tab })}
        onClose={() => setInvite((current) => ({ ...current, open: false }))}
        onScan={handleScan}
        notify={show}
      />}
      <ForwardDialog message={forwarding} conversations={lists.inbox} onClose={() => setForwarding(null)} onForward={forwardMessage} />
      <ConfirmDialog request={confirm} onClose={() => setConfirm(null)} onConfirm={confirmAction} />
      <AlertDialog alert={alert} onClose={() => setAlert(null)} />
      <MediaDialog
        open={mediaState.open}
        media={media}
        focused={focusedMedia}
        onFocus={(attachment) => setMediaState({ open: true, focusId: attachment?.id })}
        onDownload={(attachment) => void downloadFile(attachment)}
        onClose={() => setMediaState({ open: false })}
      />
      {ringingCall && (
        <IncomingCallBanner
          key={ringingCall.callId}
          call={ringingCall}
          ring={soundOn}
          onAccept={() => void acceptCall(ringingCall)}
          onDecline={() => declineCall(ringingCall)}
        />
      )}
      {currentCall && (
        <CallScreen
          key={currentCall.callId}
          call={currentCall}
          minimized={callMinimized}
          onMinimizedChange={setCallMinimized}
          onEnded={callEnded}
          onMediaError={(title, message) => setAlert({ title, message })}
        />
      )}
      <ToastRegion toasts={toasts} onDismiss={dismiss} />
    </main>
  )
}
