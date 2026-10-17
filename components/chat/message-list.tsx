'use client'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { ArrowDown, Globe2 } from 'lucide-react'
import type { Conversation, Message } from '@/lib/chat-data'
import { dayLabel, firstName, startOfDay } from '@/lib/chat-format'
import { Avatar } from './avatar'
import { MessageBubble, type MessageActions } from './message-bubble'

const GROUP_WINDOW = 5 * 60_000
const LOAD_MORE_THRESHOLD = 120

type MessageListProps = {
  chat: Conversation
  messages: Message[]
  myLanguage: string
  loading: boolean
  loadingMore: boolean
  canLoadMore: boolean
  onLoadMore: () => void
  typingAuthor?: string
  highlight: string
  currentMatchId?: string
  actions: MessageActions
}

export function MessageList({
  chat,
  messages,
  myLanguage,
  loading,
  loadingMore,
  canLoadMore,
  onLoadMore,
  typingAuthor,
  highlight,
  currentMatchId,
  actions,
}: MessageListProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const atBottom = useRef(true)
  const openedAt = useRef(Date.now())
  const lastId = useRef<string | undefined>(undefined)
  const firstId = useRef<string | undefined>(undefined)
  const heightBeforeLoad = useRef<number | null>(null)
  const [showJump, setShowJump] = useState(false)
  const [menuId, setMenuId] = useState<string | null>(null)

  function scrollToBottom(behavior: ScrollBehavior) {
    const container = containerRef.current
    if (!container) return
    container.scrollTo({ top: container.scrollHeight, behavior })
    atBottom.current = true
    setShowJump(false)
  }

  function requestOlder() {
    const container = containerRef.current
    if (!container || !canLoadMore || loadingMore) return
    heightBeforeLoad.current = container.scrollHeight
    onLoadMore()
  }

  useLayoutEffect(() => {
    openedAt.current = Date.now()
    lastId.current = undefined
    firstId.current = undefined
    heightBeforeLoad.current = null
    setMenuId(null)
    atBottom.current = true
    // Only re-run when switching conversations.
  }, [chat.id])

  useLayoutEffect(() => {
    const container = containerRef.current
    if (!container || !messages.length) return
    const newFirst = messages[0].id
    const newLast = messages[messages.length - 1].id
    const prependedOlder = firstId.current !== undefined && newFirst !== firstId.current && newLast === lastId.current
    if (prependedOlder && heightBeforeLoad.current !== null) {
      container.scrollTop += container.scrollHeight - heightBeforeLoad.current
      heightBeforeLoad.current = null
    } else if (lastId.current === undefined) {
      container.scrollTop = container.scrollHeight
    } else if (newLast !== lastId.current) {
      const latest = messages[messages.length - 1]
      const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      if (atBottom.current || latest.from === 'me') scrollToBottom(reduceMotion ? 'auto' : 'smooth')
      else setShowJump(true)
    }
    firstId.current = newFirst
    lastId.current = newLast
  }, [messages])

  useEffect(() => {
    if (typingAuthor && atBottom.current) scrollToBottom('smooth')
  }, [typingAuthor])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const onMediaLoad = () => {
      if (atBottom.current) container.scrollTop = container.scrollHeight
    }
    container.addEventListener('load', onMediaLoad, true)
    return () => container.removeEventListener('load', onMediaLoad, true)
  }, [])

  useEffect(() => {
    if (!currentMatchId) return
    document.getElementById(`msg-${currentMatchId}`)?.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }, [currentMatchId])

  useEffect(() => {
    if (!menuId) return
    const onPointerDown = (event: PointerEvent) => {
      const row = document.getElementById(`msg-${menuId}`)
      if (row && !row.contains(event.target as Node)) setMenuId(null)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      event.stopPropagation()
      setMenuId(null)
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown, true)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown, true)
    }
  }, [menuId])

  const items = messages.map((message, index) => {
    const previous = messages[index - 1]
    const next = messages[index + 1]
    const sameDayAsPrevious = previous && startOfDay(previous.createdAt) === startOfDay(message.createdAt)
    const joinsPrevious = Boolean(sameDayAsPrevious && previous.from === message.from && previous.author === message.author && message.createdAt - previous.createdAt < GROUP_WINDOW)
    const joinsNext = Boolean(next && startOfDay(next.createdAt) === startOfDay(message.createdAt) && next.from === message.from && next.author === message.author && next.createdAt - message.createdAt < GROUP_WINDOW)
    return { message, showDay: !sameDayAsPrevious, joinsPrevious, joinsNext }
  })

  return (
    <div className="message-area-wrap">
      <div
        className="message-area"
        ref={containerRef}
        role="log"
        aria-label={`Messages with ${chat.name}`}
        aria-busy={loading}
        onScroll={(event) => {
          const element = event.currentTarget
          atBottom.current = element.scrollHeight - element.scrollTop - element.clientHeight < 80
          if (atBottom.current) setShowJump(false)
          if (element.scrollTop < LOAD_MORE_THRESHOLD) requestOlder()
        }}
      >
        {(canLoadMore || loadingMore) && (
          <button type="button" className="load-older" onClick={requestOlder} disabled={loadingMore}>
            {loadingMore ? 'Loading earlier messages…' : 'Load earlier messages'}
          </button>
        )}
        {loading && (
          <div className="message-skeletons" aria-label="Loading messages">
            {[0, 1, 2, 3].map((index) => <div className={`message-skeleton ${index % 2 ? 'mine' : ''}`} key={index} />)}
          </div>
        )}
        {!loading && !messages.length && (
          <div className="conversation-empty">
            <Avatar initials={chat.initials} color={chat.color} imageUrl={chat.imageUrl} />
            <strong>{chat.group ? `Say hello to ${chat.name}` : `Say hello to ${firstName(chat.name)}`}</strong>
            <span>
              <Globe2 />{' '}
              {chat.group
                ? 'Everyone reads your messages in their own language.'
                : chat.language && chat.language !== myLanguage
                  ? `You write in ${myLanguage}. ${firstName(chat.name)} reads in ${chat.language}.`
                  : 'Your messages will appear here.'}
            </span>
          </div>
        )}
        {items.map(({ message, showDay, joinsPrevious, joinsNext }) => (
          <div className="message-slot" key={message.id}>
            {showDay && <div className="day-marker"><span>{dayLabel(message.createdAt)}</span></div>}
            <MessageBubble
              message={message}
              chat={chat}
              myLanguage={myLanguage}
              showAvatar={!joinsNext}
              showAuthor={Boolean(chat.group && message.from === 'them' && !joinsPrevious)}
              grouped={joinsPrevious}
              isNew={message.createdAt > openedAt.current}
              highlight={highlight}
              isCurrentMatch={currentMatchId === message.id}
              menuOpen={menuId === message.id}
              onMenuChange={(open) => setMenuId(open ? message.id : null)}
              actions={actions}
            />
          </div>
        ))}
        {typingAuthor && (
          <div className="typing" aria-live="polite">
            <span className="typing-dots"><i /><i /><i /></span>
            <span>{firstName(typingAuthor)} is typing</span>
          </div>
        )}
      </div>
      {showJump && (
        <button type="button" className="jump-button" onClick={() => scrollToBottom('smooth')}>
          <ArrowDown /> New messages
        </button>
      )}
    </div>
  )
}
