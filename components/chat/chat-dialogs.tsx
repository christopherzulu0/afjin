'use client'

import { ArrowLeft, Download, FileText } from 'lucide-react'
import type { Attachment, Conversation, Member } from '@/lib/chat-data'
import { firstName, formatBytes } from '@/lib/chat-format'
import { Modal } from './modal'
import { VoiceNote } from './voice-note'

export type ConfirmRequest =
  | { kind: 'block' | 'leave'; chat: Conversation }
  | { kind: 'remove' | 'ban'; chat: Conversation; member: Member }

function confirmCopy(request: ConfirmRequest) {
  const chatName = request.chat.group ? request.chat.name : firstName(request.chat.name)
  switch (request.kind) {
    case 'block':
      return {
        title: `Block ${chatName}?`,
        body: `${chatName} won’t be able to message you, and you won’t get notifications from this chat. You can unblock anytime from chat details.`,
        action: `Block ${chatName}`,
      }
    case 'leave':
      return {
        title: `Leave ${chatName}?`,
        body: 'You’ll stop receiving messages from this group. An admin can add you back with your PIN.',
        action: 'Leave group',
      }
    case 'remove':
      return {
        title: `Remove ${request.member.name}?`,
        body: `${request.member.name} will leave ${chatName} and stop getting its messages. An admin can add them back later.`,
        action: 'Remove',
      }
    case 'ban':
      return {
        title: `Ban ${request.member.name}?`,
        body: `${request.member.name} will be removed from ${chatName} and won’t be able to rejoin unless an admin unbans them.`,
        action: 'Ban',
      }
  }
}

export function ConfirmDialog({ request, onClose, onConfirm }: { request: ConfirmRequest | null; onClose: () => void; onConfirm: (request: ConfirmRequest) => void }) {
  const copy = request ? confirmCopy(request) : null

  return (
    <Modal open={Boolean(request)} title={copy?.title ?? ''} onClose={onClose} className="confirm-modal">
      <p>{copy?.body}</p>
      <div className="modal-actions">
        <button type="button" className="modal-secondary" onClick={onClose}>Cancel</button>
        <button type="button" className="modal-danger" onClick={() => request && onConfirm(request)}>{copy?.action}</button>
      </div>
    </Modal>
  )
}

type MediaDialogProps = {
  open: boolean
  media: Attachment[]
  focused?: Attachment
  onFocus: (attachment?: Attachment) => void
  onDownload: (attachment: Attachment) => void
  onClose: () => void
}

export function MediaDialog({ open, media, focused, onFocus, onDownload, onClose }: MediaDialogProps) {
  const images = media.filter((item) => item.kind === 'image')
  const others = media.filter((item) => item.kind !== 'image')

  return (
    <Modal open={open} title={focused ? focused.name : 'Shared media'} onClose={onClose} className="media-modal">
      {focused?.url ? (
        <div className="media-focus">
          <img src={focused.url} alt={focused.name} decoding="async" />
          <div className="modal-actions">
            <button type="button" className="modal-secondary" onClick={() => onFocus(undefined)}><ArrowLeft /> All media</button>
            <button type="button" className="modal-primary" onClick={() => onDownload(focused)}><Download /> Download</button>
          </div>
        </div>
      ) : (
        <>
          {images.length > 0 && (
            <div className="media-gallery">
              {images.map((image) => (
                <button type="button" key={image.id} onClick={() => onFocus(image)} aria-label={`Open ${image.name}`} disabled={!image.url}>
                  {image.url ? <img src={image.url} alt="" width={72} height={72} loading="lazy" decoding="async" /> : <span>{image.name}</span>}
                </button>
              ))}
            </div>
          )}
          {others.length > 0 && (
            <ul className="media-files">
              {others.map((item) => (
                <li key={item.id}>
                  {item.kind === 'audio' ? (
                    <VoiceNote attachment={item} onDownload={item.url ? () => onDownload(item) : undefined} />
                  ) : (
                    <>
                      <FileText />
                      <span><strong>{item.name}</strong><small>{formatBytes(item.size)}</small></span>
                      {item.url ? (
                        <button type="button" className="media-download" onClick={() => onDownload(item)} aria-label={`Download ${item.name}`}><Download /></button>
                      ) : (
                        <small>Sending…</small>
                      )}
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}
          {!media.length && <p className="detail-empty">Nothing shared yet.</p>}
        </>
      )}
    </Modal>
  )
}
