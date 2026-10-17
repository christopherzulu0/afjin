'use client'

import { ArrowLeft, Download, FileText } from 'lucide-react'
import type { Attachment, Conversation } from '@/lib/chat-data'
import { firstName, formatBytes } from '@/lib/chat-format'
import { Modal } from './modal'
import { VoiceNote } from './voice-note'

export type ConfirmRequest = { kind: 'block' | 'leave'; chat: Conversation }

export function ConfirmDialog({ request, onClose, onConfirm }: { request: ConfirmRequest | null; onClose: () => void; onConfirm: (request: ConfirmRequest) => void }) {
  const name = request ? (request.chat.group ? request.chat.name : firstName(request.chat.name)) : ''
  const blocking = request?.kind === 'block'

  return (
    <Modal open={Boolean(request)} title={blocking ? `Block ${name}?` : `Leave ${name}?`} onClose={onClose} className="confirm-modal">
      <p>
        {blocking
          ? `${name} won’t be able to message you, and you won’t get notifications from this chat. You can unblock anytime from chat details.`
          : 'You’ll stop receiving messages from this group. Someone in the group can add you back with your PIN.'}
      </p>
      <div className="modal-actions">
        <button type="button" className="modal-secondary" onClick={onClose}>Cancel</button>
        <button type="button" className="modal-danger" onClick={() => request && onConfirm(request)}>
          {blocking ? `Block ${name}` : 'Leave group'}
        </button>
      </div>
    </Modal>
  )
}

type MediaDialogProps = {
  open: boolean
  media: Attachment[]
  focused?: Attachment
  onFocus: (attachment?: Attachment) => void
  onClose: () => void
}

export function MediaDialog({ open, media, focused, onFocus, onClose }: MediaDialogProps) {
  const images = media.filter((item) => item.kind === 'image')
  const others = media.filter((item) => item.kind !== 'image')

  return (
    <Modal open={open} title={focused ? focused.name : 'Shared media'} onClose={onClose} className="media-modal">
      {focused?.url ? (
        <div className="media-focus">
          <img src={focused.url} alt={focused.name} />
          <div className="modal-actions">
            <button type="button" className="modal-secondary" onClick={() => onFocus(undefined)}><ArrowLeft /> All media</button>
            <a className="modal-primary" href={focused.url} target="_blank" rel="noopener noreferrer" download={focused.name}><Download /> Open original</a>
          </div>
        </div>
      ) : (
        <>
          {images.length > 0 && (
            <div className="media-gallery">
              {images.map((image) => (
                <button type="button" key={image.id} onClick={() => onFocus(image)} aria-label={`Open ${image.name}`} disabled={!image.url}>
                  {image.url ? <img src={image.url} alt="" /> : <span>{image.name}</span>}
                </button>
              ))}
            </div>
          )}
          {others.length > 0 && (
            <ul className="media-files">
              {others.map((item) => (
                <li key={item.id}>
                  {item.kind === 'audio' ? (
                    <VoiceNote attachment={item} />
                  ) : (
                    <>
                      <FileText />
                      <span><strong>{item.name}</strong><small>{formatBytes(item.size)}</small></span>
                      {item.url ? <a href={item.url} target="_blank" rel="noopener noreferrer" download={item.name} aria-label={`Open ${item.name}`}><Download /></a> : <small>Sending…</small>}
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
