'use client'

import { useState, type FormEvent } from 'react'
import { Archive, ArchiveRestore, Ban, Bell, BellOff, ChevronDown, FileText, Globe2, LogOut, Mic, Phone, Search, UserPlus, Video, X } from 'lucide-react'
import { normalizePin, pinPattern, type Attachment, type Conversation } from '@/lib/chat-data'
import { firstName } from '@/lib/chat-format'
import { languages } from '@/lib/speech'
import { Avatar } from './avatar'

type DetailsPanelProps = {
  chat: Conversation
  myLanguage: string
  open: boolean
  media: Attachment[]
  onClose: () => void
  onCall: (kind: 'voice' | 'video') => void
  onSearch: () => void
  onToggleTranslation: () => void
  onSetMyLanguage: (language: string) => void
  onToggleMute: () => void
  onToggleArchive: () => void
  onBlock: () => void
  onLeave: () => void
  onAddMember: (pin: string) => Promise<boolean>
  onOpenMedia: (attachment?: Attachment) => void
}

export function DetailsPanel({
  chat,
  myLanguage,
  open,
  media,
  onClose,
  onCall,
  onSearch,
  onToggleTranslation,
  onSetMyLanguage,
  onToggleMute,
  onToggleArchive,
  onBlock,
  onLeave,
  onAddMember,
  onOpenMedia,
}: DetailsPanelProps) {
  const [pin, setPin] = useState('')
  const [adding, setAdding] = useState(false)
  const name = firstName(chat.name)
  const preview = media.slice(-3).reverse()
  const validPin = pinPattern.test(normalizePin(pin))

  async function addMember(event: FormEvent) {
    event.preventDefault()
    if (!validPin) return
    setAdding(true)
    const ok = await onAddMember(normalizePin(pin))
    setAdding(false)
    if (ok) setPin('')
  }

  return (
    <aside className={`details-panel ${open ? 'details-open' : ''}`} aria-label="Chat details">
      <div className="details-top">
        <span>Chat details</span>
        <button type="button" className="icon-button" aria-label="Close details" onClick={onClose}><X /></button>
      </div>
      <div className="details-profile">
        <Avatar initials={chat.initials} color={chat.color} imageUrl={chat.imageUrl} />
        <h2>{chat.name}</h2>
        <p>{chat.group ? `Group · ${chat.members.length + 1} members` : `${chat.pin ?? ''} · Connected via PIN`}</p>
        <span className={`status-pill ${chat.online && !chat.blocked ? '' : 'is-offline'}`}>
          {chat.online && !chat.blocked && <i />} {chat.blocked ? 'Blocked' : chat.group ? 'Group chat' : chat.online ? 'Online now' : 'Offline'}
        </span>
      </div>
      <div className="detail-actions">
        <button type="button" onClick={() => onCall('voice')}><Phone /><span>Call</span></button>
        <button type="button" onClick={() => onCall('video')}><Video /><span>Video</span></button>
        <button type="button" onClick={onSearch}><Search /><span>Search</span></button>
      </div>

      <div className="detail-section">
        <h3>Language settings</h3>
        <div className="language-card">
          <div className="lang-orb"><Globe2 /></div>
          <div>
            <strong>Automatic translation</strong>
            <span>{chat.translationEnabled ? 'On for this chat' : 'Paused for this chat'}</span>
          </div>
          <button
            type="button"
            className={`toggle-on ${chat.translationEnabled ? '' : 'is-off'}`}
            aria-label="Toggle translation"
            aria-pressed={chat.translationEnabled}
            onClick={onToggleTranslation}
          >
            <span />
          </button>
        </div>
        <div className="language-line">
          <span>You read and write in</span>
          <label>
            <select value={myLanguage} onChange={(event) => onSetMyLanguage(event.target.value)} aria-label="Your language">
              {languages.map((language) => <option key={language}>{language}</option>)}
            </select>
            <ChevronDown />
          </label>
        </div>
        {!chat.group && chat.language && (
          <div className="language-line">
            <span>{name} reads in</span>
            <b className="language-value">{chat.language}</b>
          </div>
        )}
      </div>

      {chat.group && (
        <div className="detail-section">
          <h3>Members <small className="member-count">{chat.members.length + 1}</small></h3>
          <ul className="member-list" aria-label="Members">
            <li className="member-self"><span className="member-you">You</span><span><small>Reads in {myLanguage}</small></span></li>
            {chat.members.map((member) => (
              <li key={member.id}>
                <Avatar initials={member.initials} color={member.color} imageUrl={member.imageUrl} small />
                <span><strong>{member.name}</strong><small>Reads in {member.language}</small></span>
              </li>
            ))}
          </ul>
          <form className="add-member" onSubmit={addMember}>
            <input value={pin} onChange={(event) => setPin(event.target.value)} placeholder="Add by PIN, e.g. AFJ-7K2P" aria-label="Add a member by PIN" />
            <button type="submit" disabled={!validPin || adding} aria-label="Add member"><UserPlus /></button>
          </form>
        </div>
      )}

      <div className="detail-section shared">
        <h3>
          Shared media <small>{media.length}</small>
          {media.length > 0 && <button type="button" onClick={() => onOpenMedia()}>See all</button>}
        </h3>
        {preview.length ? (
          <div className="media-grid">
            {preview.map((attachment) => (
              <button type="button" className="media-thumb" key={attachment.id} onClick={() => onOpenMedia(attachment)} aria-label={`Open ${attachment.name}`}>
                {attachment.kind === 'image' && attachment.url ? <img src={attachment.url} alt="" /> : attachment.kind === 'audio' ? <Mic /> : <FileText />}
              </button>
            ))}
          </div>
        ) : (
          <p className="detail-empty">Photos, files, and voice notes you share will show up here.</p>
        )}
      </div>

      <div className="detail-footer">
        <button type="button" onClick={onToggleMute} aria-pressed={chat.muted}>
          {chat.muted ? <BellOff /> : <Bell />} Mute notifications <span>{chat.muted ? 'On' : 'Off'}</span>
        </button>
        <button type="button" onClick={onToggleArchive}>
          {chat.archived ? <ArchiveRestore /> : <Archive />} {chat.archived ? 'Unarchive chat' : 'Archive chat'}
        </button>
        {chat.group ? (
          <button type="button" className="danger" onClick={onLeave}><LogOut /> Leave group</button>
        ) : (
          <button type="button" className="danger" onClick={onBlock}>
            <Ban /> {chat.blocked ? `Unblock ${name}` : `Block ${name}`}
          </button>
        )}
      </div>
    </aside>
  )
}
