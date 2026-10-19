'use client'

import { Fragment, memo, useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { Check, CheckCheck, Copy, Download, FileText, Forward, Globe2, Image as ImageIcon, Pencil, PhoneIncoming, PhoneMissed, PhoneOutgoing, Pin, PinOff, Reply, SmilePlus, Trash2, Video, Volume2, X } from 'lucide-react'
import type { Attachment, CallLog, Conversation, LinkPreview, Message } from '@/lib/chat-data'
import { firstName, formatBytes, formatTime } from '@/lib/chat-format'
import { languageCode } from '@/lib/speech'
import { useMenu } from '@/hooks/use-menu'
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
  onDownload: (attachment: Attachment) => void
  onCallBack: (kind: CallLog['kind']) => void
  onPin: (message: Message) => void
  onForward: (message: Message) => void
  onDismissPreview: (message: Message) => void
  onJumpTo: (messageId: string) => void
}

export function canPinIn(chat: Conversation) {
  return !chat.group || chat.myRole !== 'member'
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
  onMenuChange: (messageId: string, open: boolean) => void
  actions: MessageActions
}

const TOOLBAR_CLEARANCE = 56

function isTouchOnly() {
  return window.matchMedia('(hover: none)').matches
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

const LINK_PATTERN = /\bhttps?:\/\/[^\s<>"'`]+/gi
const LINK_TRAILING = /[.,!?;:)\]}'"]+$/

function renderText(text: string, query: string): ReactNode {
  const parts: ReactNode[] = []
  let cursor = 0
  for (const match of text.matchAll(LINK_PATTERN)) {
    const start = match.index ?? 0
    const url = match[0].replace(LINK_TRAILING, '')
    if (start > cursor) parts.push(<Fragment key={`t${cursor}`}>{highlightText(text.slice(cursor, start), query)}</Fragment>)
    parts.push(
      <a key={`l${start}`} className="message-link" href={url} target="_blank" rel="noopener noreferrer nofollow">
        {highlightText(url, query)}
      </a>,
    )
    cursor = start + url.length
  }
  if (cursor < text.length) parts.push(<Fragment key={`t${cursor}`}>{highlightText(text.slice(cursor), query)}</Fragment>)
  return parts
}

function LinkPreviewCard({ preview, onDismiss }: { preview: LinkPreview; onDismiss?: () => void }) {
  return (
    <div className="link-preview">
      <a href={preview.url} target="_blank" rel="noopener noreferrer nofollow" className="link-preview-body">
        {preview.image && <img src={preview.image} alt="" width={400} height={210} loading="lazy" decoding="async" referrerPolicy="no-referrer" />}
        <span>
          {preview.siteName && <small>{preview.siteName}</small>}
          <strong>{preview.title}</strong>
          {preview.description && <span>{preview.description}</span>}
        </span>
      </a>
      {onDismiss && (
        <button type="button" className="link-preview-dismiss" aria-label="Remove link preview" onClick={onDismiss}><X /></button>
      )}
    </div>
  )
}

export function displayedText(message: Message, chat: Conversation, showAlternate = false) {
  if (message.from === 'them') {
    const useTranslation = chat.translationEnabled && !showAlternate && message.translationState === 'done' && message.translatedText
    return useTranslation ? message.translatedText! : message.text
  }
  return showAlternate && message.outgoingTranslation ? message.outgoingTranslation : message.text
}

function callDuration(ms: number) {
  const seconds = Math.round(ms / 1000)
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  return minutes < 60 ? `${minutes} min` : `${Math.floor(minutes / 60)} h ${minutes % 60} min`
}

function CallLogRow({ message, call, chat, onCallBack }: { message: Message; call: CallLog; chat: Conversation; onCallBack: (kind: CallLog['kind']) => void }) {
  const mine = message.from === 'me'
  const kind = call.kind === 'video' ? 'Video call' : 'Voice call'
  const missed = call.outcome !== 'ended'
  let label = `${kind} · ${callDuration(call.durationMs)}`
  if (call.outcome === 'missed') label = mine ? `${kind} · No answer` : `Missed ${kind.toLowerCase()}`
  if (call.outcome === 'declined') label = mine ? `${kind} · Declined` : `You declined a ${kind.toLowerCase()}`
  const Icon = call.kind === 'video' ? Video : missed && !mine ? PhoneMissed : mine ? PhoneOutgoing : PhoneIncoming
  const who = chat.group && !mine ? `${firstName(message.author)} · ` : ''

  return (
    <div className="call-log" id={`msg-${message.id}`}>
      <span className={`call-log-chip ${missed && !mine ? 'is-missed' : ''}`}>
        <Icon aria-hidden />
        <span>{who}{label}</span>
        <time dateTime={new Date(message.createdAt).toISOString()}>{formatTime(message.createdAt)}</time>
        {!chat.blocked && !chat.blockedMe && (
          <button type="button" onClick={() => onCallBack(call.kind)}>Call back</button>
        )}
      </span>
    </div>
  )
}

export const MessageBubble = memo(function MessageBubble({
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
  onMenuChange: changeMenu,
  actions,
}: MessageBubbleProps) {
  const onMenuChange = (open: boolean) => changeMenu(message.id, open)
  const [showAlternate, setShowAlternate] = useState(false)
  const [reactionsOpen, setReactionsOpen] = useState(false)
  const [actionsBelow, setActionsBelow] = useState(false)
  const reactionRef = useRef<HTMLDivElement>(null)
  const closeReactions = useCallback(() => setReactionsOpen(false), [])
  useMenu(reactionRef, reactionsOpen, closeReactions)
  const pressTimer = useRef<number | null>(null)
  useEffect(() => () => {
    if (pressTimer.current) window.clearTimeout(pressTimer.current)
  }, [])
  const mine = message.from === 'me'
  const member = chat.members.find((person) => person.id === message.senderId)

  const text = displayedText(message, chat, showAlternate)
  const showingTranslation = text !== message.text
  const textLanguage = showingTranslation ? (mine ? chat.language : myLanguage) : message.translatedFrom
  const translationState = mine ? message.outgoingState : message.translationState
  const hasTranslation = chat.translationEnabled && translationState !== 'none' && Boolean(message.text)

  function startPress() {
    pressTimer.current = window.setTimeout(() => onMenuChange(true), 450)
  }

  function cancelPress() {
    if (pressTimer.current) window.clearTimeout(pressTimer.current)
    pressTimer.current = null
  }

  function placeToolbar(row: HTMLElement) {
    const area = row.closest('.message-area')
    if (!area) return
    setActionsBelow(row.getBoundingClientRect().top - area.getBoundingClientRect().top < TOOLBAR_CLEARANCE)
  }

  function openFromTap(event: React.MouseEvent<HTMLElement>) {
    if (!isTouchOnly()) return
    if ((event.target as HTMLElement).closest('a, button, audio, input')) return
    onMenuChange(true)
  }

  if (message.call) return <CallLogRow message={message} call={message.call} chat={chat} onCallBack={actions.onCallBack} />

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

  const downloadable = message.attachments.filter((attachment) => attachment.url)
  const reactionGroups = (message.reactions ?? []).reduce<Record<string, { count: number; mine: boolean }>>((groups, reaction) => {
    const group = groups[reaction.emoji] ?? { count: 0, mine: false }
    groups[reaction.emoji] = { count: group.count + 1, mine: group.mine || reaction.by === 'me' }
    return groups
  }, {})

  return (
    <div
      className={`message-row ${mine ? 'mine' : ''} ${grouped ? 'grouped' : ''} ${isNew ? 'is-new' : ''} ${isCurrentMatch ? 'is-match' : ''} ${menuOpen ? 'menu-open' : ''} ${actionsBelow ? 'actions-below' : ''}`}
      id={`msg-${message.id}`}
      onMouseEnter={(event) => placeToolbar(event.currentTarget)}
      onFocus={(event) => placeToolbar(event.currentTarget)}
      onContextMenu={(event) => {
        event.preventDefault()
        placeToolbar(event.currentTarget)
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
        <div className={`message-bubble ${mine ? 'mine' : ''} ${message.attachments.some((item) => item.kind === 'image') ? 'has-media' : ''}`} onClick={openFromTap}>
          {message.forwarded && <span className="forwarded-label"><Forward aria-hidden /> Forwarded</span>}
          {message.reply && (
            <button type="button" className="reply-quote" onClick={() => actions.onJumpTo(message.reply!.id)}>
              <strong>{message.reply.from === 'me' ? 'You' : firstName(message.reply.author)}</strong>
              <span>{message.reply.summary}</span>
            </button>
          )}
          {message.attachments.map((attachment) => (
            <AttachmentView key={attachment.id} attachment={attachment} onOpen={actions.onOpenMedia} onDownload={actions.onDownload} />
          ))}
          {text && (
            <p dir="auto" lang={languageCode(textLanguage)}>
              {renderText(text, highlight)}
            </p>
          )}
          {message.linkPreview && (
            <LinkPreviewCard preview={message.linkPreview} onDismiss={mine ? () => actions.onDismissPreview(message) : undefined} />
          )}
          <div className="bubble-meta">
            {message.pinned && <Pin className="pinned-mark" role="img" aria-label="Pinned" />}
            {message.edited && <span className="edited-tag">edited</span>}
            <time dateTime={new Date(message.createdAt).toISOString()}>{formatTime(message.createdAt)}</time>
            {mine && message.status && <Receipt status={message.status} />}
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
          <span className="translated-label"><Globe2 /> Translation unavailable · shown in {message.translatedFrom}</span>
        )}
        {hasTranslation && translationState === 'done' && (
          <button type="button" className="translated-label" onClick={() => setShowAlternate((value) => !value)}>
            <Globe2 />
            {mine
              ? showAlternate ? 'Show what you wrote' : `Sent in ${chat.language} · See translation`
              : showAlternate ? 'View translation' : `Translated from ${message.translatedFrom} · View original`}
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
        {downloadable.length > 0 && (
          <button
            type="button"
            aria-label={downloadable.length > 1 ? `Download ${downloadable.length} attachments` : 'Download attachment'}
            onClick={() => {
              downloadable.forEach((attachment) => actions.onDownload(attachment))
              onMenuChange(false)
            }}
          >
            <Download />
          </button>
        )}
        <button type="button" aria-label="Forward message" onClick={() => { actions.onForward(message); onMenuChange(false) }}><Forward /></button>
        {canPinIn(chat) && (
          <button type="button" aria-label={message.pinned ? 'Unpin message' : 'Pin message'} onClick={() => { actions.onPin(message); onMenuChange(false) }}>
            {message.pinned ? <PinOff /> : <Pin />}
          </button>
        )}
        {mine && message.text && <button type="button" aria-label="Edit message" onClick={() => { actions.onEdit(message); onMenuChange(false) }}><Pencil /></button>}
        {mine && <button type="button" aria-label="Delete message" className="danger" onClick={() => { actions.onDelete(message); onMenuChange(false) }}><Trash2 /></button>}
      </div>
    </div>
  )
})

const RECEIPT_LABEL: Record<NonNullable<Message['status']>, string> = { sent: 'Sent', delivered: 'Delivered', read: 'Read' }

function Receipt({ status }: { status: NonNullable<Message['status']> }) {
  return (
    <span className={`receipt is-${status}`} role="img" aria-label={RECEIPT_LABEL[status]} title={RECEIPT_LABEL[status]}>
      {status === 'sent' ? <Check aria-hidden /> : <CheckCheck aria-hidden />}
      {status === 'read' && <span className="receipt-label" aria-hidden>Read</span>}
    </span>
  )
}

type AttachmentViewProps = { attachment: Attachment; onOpen: (attachment: Attachment) => void; onDownload: (attachment: Attachment) => void }

function AttachmentView({ attachment, onOpen, onDownload }: AttachmentViewProps) {
  if (attachment.kind === 'audio') return <VoiceNote attachment={attachment} onDownload={attachment.url ? () => onDownload(attachment) : undefined} />
  if (attachment.kind === 'image') {
    return attachment.url ? (
      <div className="bubble-image-wrap">
        <button type="button" className="bubble-image" onClick={() => onOpen(attachment)} aria-label={`Open ${attachment.name}`}>
          <img src={attachment.url} alt={attachment.name} width={320} height={240} loading="lazy" decoding="async" />
        </button>
        <button type="button" className="image-download" aria-label={`Download ${attachment.name}`} onClick={() => onDownload(attachment)}><Download /></button>
      </div>
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
    <button type="button" className="bubble-file" onClick={() => onDownload(attachment)} aria-label={`Download ${attachment.name}`}>
      {body}
      <Download className="file-download-icon" />
    </button>
  ) : (
    <div className="bubble-file is-unavailable">{body}</div>
  )
}
