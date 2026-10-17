'use client'

import Link from 'next/link'
import { useCallback, useMemo, useRef, useState, type RefObject } from 'react'
import { UserButton } from '@clerk/nextjs'
import { Archive, ArrowLeft, Ban, Bell, BellOff, BellRing, Copy, Home, MoreHorizontal, Plus, Search, X } from 'lucide-react'
import type { Conversation } from '@/lib/chat-data'
import { listTime } from '@/lib/chat-format'
import { useDismiss } from '@/hooks/use-dismiss'
import { Avatar } from './avatar'

export type PushStatus = 'unsupported' | 'unconfigured' | 'default' | 'denied' | 'enabled' | 'working'

type SidebarProps = {
  conversations: Conversation[]
  unreadChats: Conversation[]
  archivedCount: number
  loading: boolean
  activeId: string | null
  typingIn: string | null
  drafts: Record<string, string>
  myName: string
  myLanguage: string
  myPin: string
  view: 'inbox' | 'archived'
  query: string
  searchRef: RefObject<HTMLInputElement | null>
  mobileVisible: boolean
  pushStatus: PushStatus
  onViewChange: (view: 'inbox' | 'archived') => void
  onQueryChange: (query: string) => void
  onSelect: (id: string) => void
  onNewChat: () => void
  onClose: () => void
  onCopyPin: () => void
  onEnablePush: () => void
  onDisablePush: () => void
}

const pushLabels: Record<PushStatus, string> = {
  unsupported: 'This browser can’t show notifications',
  unconfigured: 'Notifications aren’t set up yet',
  default: 'Turn on notifications',
  denied: 'Notifications are blocked in your browser',
  enabled: 'Turn off notifications',
  working: 'Updating…',
}

export function Sidebar({
  conversations,
  unreadChats,
  archivedCount,
  loading,
  activeId,
  typingIn,
  drafts,
  myName,
  myLanguage,
  myPin,
  view,
  query,
  searchRef,
  mobileVisible,
  pushStatus,
  onViewChange,
  onQueryChange,
  onSelect,
  onNewChat,
  onClose,
  onCopyPin,
  onEnablePush,
  onDisablePush,
}: SidebarProps) {
  const [profileOpen, setProfileOpen] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const profileRef = useRef<HTMLDivElement>(null)
  const notificationsRef = useRef<HTMLDivElement>(null)
  const closeProfile = useCallback(() => setProfileOpen(false), [])
  const closeNotifications = useCallback(() => setNotificationsOpen(false), [])
  useDismiss(profileRef, profileOpen, closeProfile)
  useDismiss(notificationsRef, notificationsOpen, closeNotifications)

  const results = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    if (!normalized) return conversations
    return conversations.filter((chat) => `${chat.name} ${chat.preview} ${chat.pin ?? ''}`.toLowerCase().includes(normalized))
  }, [conversations, query])

  return (
    <aside className={`sidebar ${mobileVisible ? 'mobile-visible' : ''}`} aria-label="Conversations">
      <div className="brand-row">
        <Link href="/" className="brand-link" aria-label="afjini home">
          <div className="brand-mark">A</div>
          <span className="brand-name">afjini</span>
        </Link>
        <button className="icon-button sidebar-close" aria-label="Close conversations" onClick={onClose}><X /></button>
      </div>

      <div className="profile-row" ref={profileRef}>
        <span className="profile-user-button">
          <UserButton appearance={{ elements: { avatarBox: { width: 40, height: 40, borderRadius: 13 } } }} />
        </span>
        <div className="profile-copy"><strong>{myName}</strong><span>{myLanguage} · {myPin}</span></div>
        <button className="icon-button" aria-label="Profile menu" aria-expanded={profileOpen} onClick={() => setProfileOpen((open) => !open)}><MoreHorizontal /></button>
        {profileOpen && (
          <div className="popover-menu profile-menu" role="menu">
            <div className="popover-note">Your PIN <b>{myPin}</b></div>
            <button type="button" role="menuitem" onClick={() => { onCopyPin(); closeProfile() }}><Copy /> Copy my PIN</button>
            <Link href="/contacts" role="menuitem" onClick={closeProfile}><Search /> Find people by PIN</Link>
            <Link href="/" role="menuitem" onClick={closeProfile}><Home /> Back to home</Link>
          </div>
        )}
      </div>

      <div className="sidebar-heading">
        {view === 'archived' ? (
          <button type="button" className="sidebar-back" onClick={() => onViewChange('inbox')}><ArrowLeft /> Archived</button>
        ) : (
          <span>Messages</span>
        )}
        <button className="new-chat" aria-label="New chat" onClick={onNewChat}><Plus /></button>
      </div>

      <label className="search-box">
        <Search />
        <input ref={searchRef} value={query} onChange={(event) => onQueryChange(event.target.value)} placeholder="Search chats" aria-label="Search chats" />
        {query ? (
          <button type="button" className="search-clear" aria-label="Clear search" onClick={() => onQueryChange('')}><X /></button>
        ) : (
          <kbd>⌘K</kbd>
        )}
      </label>

      <div className="chat-list">
        {loading && (
          <div className="chat-skeletons" aria-label="Loading conversations">
            {[0, 1, 2].map((index) => <div className="chat-skeleton" key={index} />)}
          </div>
        )}
        {!loading && results.map((chat) => {
          const draft = drafts[chat.id]?.trim()
          return (
            <button
              type="button"
              className={`chat-item ${activeId === chat.id ? 'active' : ''}`}
              key={chat.id}
              aria-current={activeId === chat.id ? 'true' : undefined}
              onClick={() => onSelect(chat.id)}
            >
              <Avatar initials={chat.initials} color={chat.color} imageUrl={chat.imageUrl} online={chat.online && !chat.blocked} small />
              <span className="chat-info">
                <strong>{chat.name}</strong>
                {typingIn === chat.id ? (
                  <span className="chat-typing">typing…</span>
                ) : draft && activeId !== chat.id ? (
                  <span><em className="chat-draft">Draft:</em> {draft}</span>
                ) : (
                  <span>{chat.preview}</span>
                )}
              </span>
              <span className="chat-meta">
                <time>{listTime(chat.lastMessageAt)}</time>
                <span className="chat-flags">
                  {chat.blocked && <Ban aria-label="Blocked" />}
                  {chat.muted && <BellOff aria-label="Muted" />}
                  {chat.unread > 0 && <b className={chat.muted ? 'is-muted' : ''}>{chat.unread}</b>}
                </span>
              </span>
            </button>
          )
        })}
        {!loading && !results.length && (
          <div className="sidebar-empty">
            {query ? (
              <>
                <Search />
                <strong>No chats match “{query}”</strong>
                <span>Try a name, a PIN, or a word from the last message.</span>
              </>
            ) : view === 'archived' ? (
              <>
                <Archive />
                <strong>No archived chats</strong>
                <span>Archive a chat to tuck it away without losing anything.</span>
              </>
            ) : (
              <>
                <Plus />
                <strong>No conversations yet</strong>
                <span>Share your PIN <b>{myPin}</b> or add someone by theirs.</span>
                <button type="button" onClick={onNewChat}>Start a new chat</button>
              </>
            )}
          </div>
        )}
      </div>

      <div className="sidebar-bottom">
        <button type="button" aria-pressed={view === 'archived'} onClick={() => onViewChange(view === 'archived' ? 'inbox' : 'archived')}>
          <Archive /> {view === 'archived' ? 'Back to messages' : 'Archived'}
          {view === 'inbox' && archivedCount > 0 && <small className="count-pill">{archivedCount}</small>}
        </button>
        <div className="notifications-wrap" ref={notificationsRef}>
          <button type="button" aria-expanded={notificationsOpen} onClick={() => setNotificationsOpen((open) => !open)}>
            <Bell /> Notifications {unreadChats.length > 0 && <span className="notify-dot" aria-label={`${unreadChats.length} unread`} />}
          </button>
          {notificationsOpen && (
            <div className="popover-menu notifications-menu" role="menu">
              <button
                type="button"
                role="menuitem"
                className="push-toggle"
                disabled={pushStatus === 'unsupported' || pushStatus === 'unconfigured' || pushStatus === 'denied' || pushStatus === 'working'}
                onClick={pushStatus === 'enabled' ? onDisablePush : onEnablePush}
              >
                {pushStatus === 'enabled' ? <BellOff /> : <BellRing />} {pushLabels[pushStatus]}
              </button>
              <div className="popover-note">{unreadChats.length ? 'Unread conversations' : 'You’re all caught up'}</div>
              {unreadChats.map((chat) => (
                <button type="button" role="menuitem" key={chat.id} onClick={() => { onSelect(chat.id); closeNotifications() }}>
                  <Avatar initials={chat.initials} color={chat.color} imageUrl={chat.imageUrl} small />
                  <span className="notification-copy"><strong>{chat.name}</strong><span>{chat.preview}</span></span>
                  <b>{chat.unread}</b>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </aside>
  )
}
