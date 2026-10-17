'use client'

import { Fragment, useCallback, useRef, useState, type ReactNode } from 'react'
import { Check, CheckCheck, Copy, FileText, Globe2, Image as ImageIcon, Pencil, Reply, SmilePlus, Trash2, Volume2 } from 'lucide-react'
import type { Attachment, Conversation, Message } from '@/lib/chat-data'
import { firstName, formatBytes, formatTime } from '@/lib/chat-format'
import { languageCode } from '@/lib/speech'
import { useDismiss } from '@/hooks/use-dismiss'
import { Avatar } from './avatar'
import { VoiceNote } from './voice-note'

export const quickReactions = ['❤️', '😂', '👍', '😮', '😢', '🙏']

export type MessageActions = {
  onReply: (message: Message) => void
  onReact: (message: Message, emoji: string) => void
  onCopy: (text: string) => void
  onEdit: (message: Message) => void
  onDelete: (message: Message) => void
  onListen: (text: string, language: string) => void
  onOpenMedia: (attachment: Attachment) => void
  onJumpTo: (messageId: string) => void
}

type MessageBubbleProps = {
  message: Message
  chat: Conversation
  myLanguage: string
  showAvatar: boolean
  showAuthor: boolean
  grouped: boolean
  isNew: boolean
  highlight: string
  isCurrentMatch: boolean
  menuOpen: boolean
  onMenuChange: (open: boolean) => void
  actions: MessageActions
}

function highlightText(text: string, query: string): ReactNode {
  const needle = query.trim()
  if (!needle) return text
  const lower = text.toLowerCase()
  const target = needle.toLowerCase()
  const parts: ReactNode[] = []
  let cursor = 0
  let index = lower.indexOf(target)
  while (index !== -1) {
    parts.push(text.slice(cursor, index), <mark key={index}>{text.slice(index, index + needle.length)}</mark>)
    cursor = index + needle.length
    index = lower.indexOf(target, cursor)
  }
  parts.push(text.slice(cursor))
  return parts.map((part, i) => <Fragment key={i}>{part}</Fragment>)
}

export function displayedText(message: Message, chat: Conversation, showAlternate = false) {
  if (message.from === 'them') {
    const useTranslation = chat.translationEnabled && !showAlternate && message.translationState === 'done' && message.translatedText
    return useTranslation ? message.translatedText! : message.text
  }
  return showAlternate && message.outgoingTranslation ? message.outgoingTranslation : message.text
}

export function MessageBubble({
  message,
  chat,
  myLanguage,
  showAvatar,
  showAuthor,
  grouped,
  isNew,
  highlight,
  isCurrentMatch,
  menuOpen,
  onMenuChange,
  actions,
}: MessageBubbleProps) {
  const [showAlternate, setShowAlternate] = useState(false)
  const [reactionsOpen, setReactionsOpen] = useState(false)
  const reactionRef = useRef<HTMLDivElement>(null)
  const closeReactions = useCallback(() => setReactionsOpen(false), [])
  useDismiss(reactionRef, reactionsOpen, closeReactions)
  const pressTimer = useRef<number | null>(null)
  const mine = message.from === 'me'
  const member = chat.members.find((person) => person.name === message.author)

  const text = displayedText(message, chat, showAlternate)
  const showingTranslation = text !== message.text
  const textLanguage = showingTranslation ? (mine ? chat.language : myLanguage) : message.sourceLanguage
  const translationState = mine ? message.outgoingState : message.translationState
  const hasTranslation = chat.translationEnabled && translationState !== 'none' && Boolean(message.text)

  function startPress() {
    pressTimer.current = window.setTimeout(() => onMenuChange(true), 450)
  }

  function cancelPress() {
    if (pressTimer.current) window.clearTimeout(pressTimer.current)
    pressTimer.current = null
  }

  if (message.deleted) {
    return (
      <div className={`message-row ${mine ? 'mine' : ''} ${grouped ? 'grouped' : ''}`} id={`msg-${message.id}`}>
        {!mine && <span className="avatar-spacer" />}
        <div className="message-stack">
          <div className="message-bubble is-deleted"><p>{mine ? 'You deleted this message' : 'This message was deleted'}</p></div>
        </div>
      </div>
    )
  }

  const reactionGroups = (message.reactions ?? []).reduce<Record<string, { count: number; mine: boolean }>>((groups, reaction) => {
    const group = groups[reaction.emoji] ?? { count: 0, mine: false }
    groups[reaction.emoji] = { count: group.count + 1, mine: group.mine || reaction.by === 'me' }
    return groups
  }, {})

  return (
    <div
      className={`message-row ${mine ? 'mine' : ''} ${grouped ? 'grouped' : ''} ${isNew ? 'is-new' : ''} ${isCurrentMatch ? 'is-match' : ''} ${menuOpen ? 'menu-open' : ''}`}
      id={`msg-${message.id}`}
      onContextMenu={(event) => {
        event.preventDefault()
        onMenuChange(true)
      }}
      onTouchStart={startPress}
      onTouchEnd={cancelPress}
      onTouchMove={cancelPress}
    >
      {!mine && (showAvatar ? (
        <Avatar initials={member?.initials ?? chat.initials} color={member?.color ?? chat.color} imageUrl={message.authorImage ?? member?.imageUrl} small />
      ) : <span className="avatar-spacer" />)}
      <div className="message-stack">
        {showAuthor && message.author && <span className="message-author">{message.author}</span>}
        <div className={`message-bubble ${mine ? 'mine' : ''} ${message.attachments.some((item) => item.kind === 'image') ? 'has-media' : ''}`}>
          {message.reply && (
            <button type="button" className="reply-quote" onClick={() => actions.onJumpTo(message.reply!.id)}>
              <strong>{message.reply.from === 'me' ? 'You' : firstName(message.reply.author)}</strong>
              <span>{message.reply.summary}</span>
            </button>
          )}
          {message.attachments?.map((attachment) => <AttachmentView key={attachment.id} attachment={attachment} onOpen={actions.onOpenMedia} />)}
          {text && (
            <p dir="auto" lang={languageCode(textLanguage)}>
              {highlightText(text, highlight)}
            </p>
          )}
          <div className="bubble-meta">
            {message.edited && <span className="edited-tag">edited</span>}
            <time dateTime={new Date(message.createdAt).toISOString()}>{formatTime(message.createdAt)}</time>
            {mine && message.status === 'sent' && <Check aria-label="Sent" />}
            {mine && message.status === 'delivered' && <CheckCheck aria-label="Delivered" />}
            {mine && message.status === 'read' && <CheckCheck className="is-read" aria-label="Read" />}
          </div>
        </div>

        {Object.keys(reactionGroups).length > 0 && (
          <div className="reaction-row">
            {Object.entries(reactionGroups).map(([emoji, group]) => (
              <button
                type="button"
                key={emoji}
                className={`reaction-chip ${group.mine ? 'is-mine' : ''}`}
                aria-label={`${emoji} reaction${group.mine ? ', yours. Tap to remove' : ''}`}
                onClick={() => actions.onReact(message, emoji)}
              >
                {emoji}{group.count > 1 && <small>{group.count}</small>}
              </button>
            ))}
          </div>
        )}

        {hasTranslation && translationState === 'pending' && (
          <span className="translated-label is-pending"><Globe2 /> {mine ? `Translating to ${chat.language}…` : 'Translating…'}</span>
        )}
        {hasTranslation && translationState === 'unavailable' && (
          <span className="translated-label"><Globe2 /> Translation unavailable · shown in {message.sourceLanguage}</span>
        )}
        {hasTranslation && translationState === 'done' && (
          <button type="button" className="translated-label" onClick={() => setShowAlternate((value) => !value)}>
            <Globe2 />
            {mine
              ? showAlternate ? 'Show what you wrote' : `Sent in ${chat.language} · See translation`
              : showAlternate ? 'View translation' : `Translated from ${message.sourceLanguage} · View original`}
          </button>
        )}
      </div>

      <div className="message-actions" role="toolbar" aria-label="Message actions">
        <div className="reaction-anchor" ref={reactionRef}>
          <button type="button" aria-label="React" aria-expanded={reactionsOpen} onClick={() => setReactionsOpen((open) => !open)}><SmilePlus /></button>
          {reactionsOpen && (
            <div className="reaction-picker" role="menu">
              {quickReactions.map((emoji) => (
                <button
                  type="button"
                  role="menuitem"
                  key={emoji}
                  aria-label={`React with ${emoji}`}
                  onClick={() => {
                    actions.onReact(message, emoji)
                    setReactionsOpen(false)
                    onMenuChange(false)
                  }}
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}
        </div>
        <button type="button" aria-label="Reply" onClick={() => { actions.onReply(message); onMenuChange(false) }}><Reply /></button>
        {text && <button type="button" aria-label="Copy text" onClick={() => { actions.onCopy(text); onMenuChange(false) }}><Copy /></button>}
        {text && <button type="button" aria-label="Read aloud" onClick={() => actions.onListen(text, textLanguage)}><Volume2 /></button>}
        {mine && message.text && <button type="button" aria-label="Edit message" onClick={() => { actions.onEdit(message); onMenuChange(false) }}><Pencil /></button>}
        {mine && <button type="button" aria-label="Delete message" className="danger" onClick={() => { actions.onDelete(message); onMenuChange(false) }}><Trash2 /></button>}
      </div>
    </div>
  )
}

function AttachmentView({ attachment, onOpen }: { attachment: Attachment; onOpen: (attachment: Attachment) => void }) {
  if (attachment.kind === 'audio') return <VoiceNote attachment={attachment} />
  if (attachment.kind === 'image') {
    return attachment.url ? (
      <button type="button" className="bubble-image" onClick={() => onOpen(attachment)} aria-label={`Open ${attachment.name}`}>
        <img src={attachment.url} alt={attachment.name} loading="lazy" />
      </button>
    ) : (
      <div className="bubble-file is-unavailable"><ImageIcon /><span><strong>{attachment.name}</strong><small>Sending…</small></span></div>
    )
  }
  const body = (
    <>
      <FileText />
      <span><strong>{attachment.name}</strong><small>{attachment.url ? formatBytes(attachment.size) : 'Sending…'}</small></span>
    </>
  )
  return attachment.url ? (
    <a className="bubble-file" href={attachment.url} target="_blank" rel="noopener noreferrer" download={attachment.name}>{body}</a>
  ) : (
    <div className="bubble-file is-unavailable">{body}</div>
  )
}
