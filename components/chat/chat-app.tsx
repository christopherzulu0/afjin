'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useConvexConnectionState, useQuery } from 'convex/react'
import { Ban, ChevronDown, ChevronUp, Copy, Globe2, Plus, Search, WifiOff, X } from 'lucide-react'
import { api } from '@/convex/_generated/api'
import type { Id } from '@/convex/_generated/dataModel'
import {
  errorMessage,
  rememberPreview,
  useChatActions,
  useConversationLists,
  useConversationMessages,
  useCurrentUser,
} from '@/hooks/use-convex-chat'
import { useWebPush } from '@/hooks/use-web-push'
import type { Attachment, Conversation } from '@/lib/chat-data'
import { firstName } from '@/lib/chat-format'
import { languages, speak } from '@/lib/speech'
import { ConfirmDialog, MediaDialog, type ConfirmRequest } from './chat-dialogs'
import { Composer, type ComposerContext, type OutgoingAttachment } from './composer'
import { ConversationHeader } from './conversation-header'
import { DetailsPanel } from './details-panel'
import type { MessageActions } from './message-bubble'
import { MessageList } from './message-list'
import { NewChatDialog } from './new-chat-dialog'
import { PresenceBeacon } from './presence-beacon'
import { Sidebar } from './sidebar'
import { ToastRegion, useToasts } from './toasts'

type ChatSearch = { open: boolean; query: string; index: number }

const TYPING_IDLE_MS = 3500

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
  const { toasts, show, dismiss } = useToasts()

  const [activeId, setActiveId] = useState<string | null>(null)
  const [view, setView] = useState<'inbox' | 'archived'>('inbox')
  const [query, setQuery] = useState('')
  const [mobileList, setMobileList] = useState(false)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [context, setContext] = useState<{ type: 'reply' | 'edit'; messageId: string } | null>(null)
  const [chatSearch, setChatSearch] = useState<ChatSearch>({ open: false, query: '', index: 0 })
  const [newChatOpen, setNewChatOpen] = useState(false)
  const [confirm, setConfirm] = useState<ConfirmRequest | null>(null)
  const [mediaState, setMediaState] = useState<{ open: boolean; focusId?: string }>({ open: false })
  const [typing, setTyping] = useState(false)

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

  const { messages, loading: messagesLoading, loadingMore, canLoadMore, loadMore } = useConversationMessages(conversationId, me?._id ?? null)
  const typists = useQuery(api.presence.typing, conversationId ? { conversationId } : 'skip')
  const typingAuthor = typists?.[0]?.name

  const selectChat = useCallback((id: string) => {
    setActiveId(id)
    setMobileList(false)
    setContext(null)
    setTyping(false)
    setChatSearch({ open: false, query: '', index: 0 })
  }, [])

  useEffect(() => {
    if (activeId || !lists.loaded || !lists.inbox.length) return
    if (window.matchMedia('(max-width: 900px)').matches) return
    setActiveId(lists.inbox[0].id)
  }, [activeId, lists])

  useEffect(() => {
    if (activeId && lists.loaded && !allChats.some((chat) => chat.id === activeId)) setActiveId(null)
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
      }
    }
  }, [lists, activeId, visible, show, selectChat])

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

  async function handleSend({ text, attachments }: { text: string; attachments: OutgoingAttachment[] }) {
    if (!activeChat || !conversationId) return false
    setTyping(false)
    try {
      if (composerContext?.type === 'edit') {
        await actions.edit({ messageId: composerContext.message.id as Id<'messages'>, body: text })
        setContext(null)
        return true
      }
      attachments.forEach((attachment) => rememberPreview(attachment.storageId, attachment.previewUrl))
      const replyTo = composerContext?.type === 'reply' && !isOptimistic(composerContext.message.id) ? (composerContext.message.id as Id<'messages'>) : undefined
      setContext(null)
      setDrafts((current) => ({ ...current, [activeChat.id]: '' }))
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
      show(errorMessage(error, 'Your message didn’t send. It’s back in the box so you can try again.'))
      return false
    }
  }

  function editLastMessage() {
    const last = messages.filter((message) => message.from === 'me' && !message.deleted && message.text && !isOptimistic(message.id)).at(-1)
    if (last) setContext({ type: 'edit', messageId: last.id })
  }

  const messageActions: MessageActions = {
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
    onJumpTo: (messageId) => {
      const element = document.getElementById(`msg-${messageId}`)
      if (!element) {
        show('That message is further back. Scroll up to load earlier messages.')
        return
      }
      element.scrollIntoView({ block: 'center', behavior: 'smooth' })
      element.classList.add('is-flash')
      window.setTimeout(() => element.classList.remove('is-flash'), 1400)
    },
  }

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
    } else {
      actions
        .leave({ conversationId: id })
        .then(() => {
          show(`You left ${request.chat.name}`)
          setActiveId(null)
        })
        .catch((error) => show(errorMessage(error)))
    }
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

  useEffect(() => {
    if (!me || linkHandled.current) return
    const pin = searchParams.get('pin')
    const conversation = searchParams.get('c')
    if (!pin && !conversation) return
    linkHandled.current = true
    if (pin) void startDirect(pin)
    else if (conversation) selectChat(conversation)
    router.replace('/chat', { scroll: false })
    // Deep links are handled once, as soon as the profile is ready.
  }, [me, searchParams])

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
    <main className="app-shell">
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
        drafts={drafts}
        myName={me.name}
        myLanguage={myLanguage}
        myPin={me.pin}
        view={view}
        query={query}
        searchRef={sidebarSearchRef}
        mobileVisible={mobileList}
        pushStatus={push.status}
        onViewChange={setView}
        onQueryChange={setQuery}
        onSelect={selectChat}
        onNewChat={() => setNewChatOpen(true)}
        onClose={() => setMobileList(false)}
        onCopyPin={copyPin}
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
              onCall={(kind) => show(`${kind === 'video' ? 'Video' : 'Voice'} calls with ${chatName} are coming soon.`)}
              onSearch={openChatSearch}
              onToggleMute={() => toggleMute(activeChat)}
              onToggleArchive={() => toggleArchive(activeChat)}
              onBlock={() => requestBlock(activeChat)}
              onLeave={() => setConfirm({ kind: 'leave', chat: activeChat })}
            />

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

            <div className={`translation-banner ${activeChat.translationEnabled ? '' : 'is-paused'}`}>
              <div className="translation-icon"><Globe2 /></div>
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
                initialDraft={drafts[activeChat.id] ?? ''}
                context={composerContext}
                textareaRef={textareaRef}
                getUploadUrl={() => actions.generateUploadUrl()}
                onDraftChange={(text) => setDrafts((current) => (current[activeChat.id] === text ? current : { ...current, [activeChat.id]: text }))}
                onCancelContext={() => setContext(null)}
                onSend={handleSend}
                onTyping={handleTyping}
                onEditLast={editLastMessage}
                notify={show}
              />
            )}
          </>
        ) : (
          <div className="conversation-placeholder onboarding">
            <div className="brand-mark">A</div>
            <strong>Welcome, {firstName(me.name)}</strong>
            <span>Share your PIN so people can find you, or add someone by theirs.</span>
            <button type="button" className="pin-copy" onClick={copyPin}><b>{me.pin}</b> <Copy /></button>
            <label className="onboarding-language">
              I read and write in
              <span className="language-button">
                <select value={myLanguage} onChange={(event) => setMyLanguage(event.target.value)} aria-label="Your language">
                  {languages.map((language) => <option key={language}>{language}</option>)}
                </select>
                <ChevronDown />
              </span>
            </label>
            <button type="button" onClick={() => setNewChatOpen(true)}><Plus /> Start a chat</button>
            {lists.inbox.length > 0 && (
              <button type="button" className="mobile-only-link" onClick={() => setMobileList(true)}>Open your conversations</button>
            )}
          </div>
        )}
      </section>

      {activeChat && (
        <DetailsPanel
          chat={activeChat}
          myLanguage={myLanguage}
          open={detailsOpen}
          media={media}
          onClose={() => setDetailsOpen(false)}
          onCall={(kind) => show(`${kind === 'video' ? 'Video' : 'Voice'} calls with ${chatName} are coming soon.`)}
          onSearch={openChatSearch}
          onToggleTranslation={() => toggleTranslation(activeChat)}
          onSetMyLanguage={setMyLanguage}
          onToggleMute={() => toggleMute(activeChat)}
          onToggleArchive={() => toggleArchive(activeChat)}
          onBlock={() => requestBlock(activeChat)}
          onLeave={() => setConfirm({ kind: 'leave', chat: activeChat })}
          onAddMember={addMember}
          onOpenMedia={(attachment) => setMediaState({ open: true, focusId: attachment?.id })}
        />
      )}

      <NewChatDialog open={newChatOpen} onClose={() => setNewChatOpen(false)} onStartDirect={startDirect} onCreateGroup={createGroup} />
      <ConfirmDialog request={confirm} onClose={() => setConfirm(null)} onConfirm={confirmAction} />
      <MediaDialog
        open={mediaState.open}
        media={media}
        focused={focusedMedia}
        onFocus={(attachment) => setMediaState({ open: true, focusId: attachment?.id })}
        onClose={() => setMediaState({ open: false })}
      />
      <ToastRegion toasts={toasts} onDismiss={dismiss} />
    </main>
  )
}
