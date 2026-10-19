'use client'

import { useMemo, useState } from 'react'
import { Check, Forward, Search } from 'lucide-react'
import type { Conversation, Message } from '@/lib/chat-data'
import { Avatar } from './avatar'
import { Modal } from './modal'

const MAX_TARGETS = 5

type ForwardDialogProps = {
  message: Message | null
  conversations: Conversation[]
  onClose: () => void
  onForward: (message: Message, conversationIds: string[]) => Promise<boolean>
}

export function ForwardDialog({ message, conversations, onClose, onForward }: ForwardDialogProps) {
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<string[]>([])
  const [busy, setBusy] = useState(false)

  const candidates = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return conversations
      .filter((chat) => !chat.blocked && !chat.blockedMe)
      .filter((chat) => !needle || chat.name.toLowerCase().includes(needle))
  }, [conversations, query])

  function close() {
    setQuery('')
    setSelected([])
    onClose()
  }

  function toggle(id: string) {
    setSelected((current) => (current.includes(id) ? current.filter((item) => item !== id) : current.length >= MAX_TARGETS ? current : [...current, id]))
  }

  async function submit() {
    if (!message || !selected.length) return
    setBusy(true)
    const ok = await onForward(message, selected)
    setBusy(false)
    if (ok) close()
  }

  const preview = message ? message.text || (message.attachments.length ? `${message.attachments.length} attachment${message.attachments.length > 1 ? 's' : ''}` : '') : ''

  return (
    <Modal open={Boolean(message)} title="Forward to…" onClose={close} className="forward-modal">
      {preview && <p className="forward-preview">“{preview.length > 120 ? `${preview.slice(0, 117)}…` : preview}”</p>}
      <label className="search-box forward-search">
        <Search />
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search chats" aria-label="Search chats to forward to" data-autofocus />
      </label>
      <div className="contact-picker" role="group" aria-label={`Choose up to ${MAX_TARGETS} chats`}>
        {candidates.map((chat) => {
          const checked = selected.includes(chat.id)
          return (
            <button
              type="button"
              role="checkbox"
              aria-checked={checked}
              key={chat.id}
              className={`contact-pick ${checked ? 'is-selected' : ''}`}
              disabled={!checked && selected.length >= MAX_TARGETS}
              onClick={() => toggle(chat.id)}
            >
              <Avatar initials={chat.initials} color={chat.color} imageUrl={chat.imageUrl} small />
              <span><strong>{chat.name}</strong><small>{chat.group ? `Group · ${chat.members.length + 1} members` : chat.language ? `Reads in ${chat.language}` : 'Direct chat'}</small></span>
              <span className="forward-check" aria-hidden>{checked && <Check />}</span>
            </button>
          )
        })}
        {!candidates.length && <p className="field-hint">No chats match “{query}”.</p>}
      </div>
      <div className="modal-actions">
        <span className="field-hint forward-count">{selected.length ? `${selected.length} of ${MAX_TARGETS} selected` : `Pick up to ${MAX_TARGETS} chats`}</span>
        <button type="button" className="modal-secondary" onClick={close}>Cancel</button>
        <button type="button" className="modal-primary" disabled={!selected.length || busy} onClick={() => void submit()}>
          <Forward /> {busy ? 'Forwarding…' : 'Forward'}
        </button>
      </div>
    </Modal>
  )
}
