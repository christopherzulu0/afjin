'use client'

import { Copy, Download, Forward, Pencil, Pin, PinOff, Reply, Trash2, Volume2 } from 'lucide-react'
import type { Conversation, Message } from '@/lib/chat-data'
import { firstName } from '@/lib/chat-format'
import { canPinIn, displayedText, quickReactions, type MessageActions } from './message-bubble'
import { Modal } from './modal'

type MessageSheetProps = {
  message: Message | null
  chat: Conversation
  myLanguage: string
  actions: MessageActions
  onClose: () => void
}

export function MessageSheet({ message, chat, myLanguage, actions, onClose }: MessageSheetProps) {
  const open = Boolean(message)
  const mine = message?.from === 'me'
  const text = message ? displayedText(message, chat) : ''
  const textLanguage = !message ? myLanguage : text !== message.text ? (mine ? chat.language : myLanguage) : message.translatedFrom
  const downloadable = message?.attachments.filter((attachment) => attachment.url) ?? []
  const myReaction = message?.reactions.find((reaction) => reaction.by === 'me')?.emoji
  const title = message ? `${mine ? 'You' : firstName(message.author)}: ${text || (message.attachments.length ? 'Attachment' : '')}` : ''

  function run(action: () => void) {
    action()
    onClose()
  }

  return (
    <Modal open={open} title={title} onClose={onClose} className="action-sheet">
      {message && (
        <>
          <div className="sheet-reactions" role="group" aria-label="React">
            {quickReactions.map((emoji) => (
              <button
                type="button"
                key={emoji}
                aria-label={`React with ${emoji}`}
                aria-pressed={myReaction === emoji}
                onClick={() => run(() => actions.onReact(message, emoji))}
              >
                {emoji}
              </button>
            ))}
          </div>
          <div className="sheet-actions">
            <button type="button" data-autofocus onClick={() => run(() => actions.onReply(message))}><Reply /> Reply</button>
            {text && <button type="button" onClick={() => run(() => actions.onCopy(text))}><Copy /> Copy text</button>}
            {text && <button type="button" onClick={() => run(() => actions.onListen(text, textLanguage))}><Volume2 /> Read aloud</button>}
            {downloadable.length > 0 && (
              <button type="button" onClick={() => run(() => downloadable.forEach((attachment) => actions.onDownload(attachment)))}>
                <Download /> {downloadable.length > 1 ? `Download ${downloadable.length} attachments` : 'Download attachment'}
              </button>
            )}
            <button type="button" onClick={() => run(() => actions.onForward(message))}><Forward /> Forward</button>
            {canPinIn(chat) && (
              <button type="button" onClick={() => run(() => actions.onPin(message))}>
                {message.pinned ? <><PinOff /> Unpin</> : <><Pin /> Pin to chat</>}
              </button>
            )}
            {mine && message.text && <button type="button" onClick={() => run(() => actions.onEdit(message))}><Pencil /> Edit</button>}
            {mine && <button type="button" className="danger" onClick={() => run(() => actions.onDelete(message))}><Trash2 /> Delete</button>}
          </div>
        </>
      )}
    </Modal>
  )
}
