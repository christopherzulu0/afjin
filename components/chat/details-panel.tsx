'use client'

import { Archive, ArchiveRestore, Ban, Bell, BellOff, ChevronDown, FileText, Globe2, LogOut, Mic, Phone, Pin, PinOff, Search, Video, X } from 'lucide-react'
import { useRef } from 'react'
import type { Id } from '@/convex/_generated/dataModel'
import type { CallInChat } from '@/hooks/use-calls'
import { useSwipeToClose } from '@/hooks/use-swipe-to-close'
import type { Attachment, Conversation, Member } from '@/lib/chat-data'
import { firstName } from '@/lib/chat-format'
import { languages } from '@/lib/speech'
import { Avatar } from './avatar'
import { GroupMembers, type MemberAction } from './group-members'
import { canPinIn } from './message-bubble'
import { usePinnedMessages } from './pinned-bar'

type DetailsPanelProps = {
  chat: Conversation
  myLanguage: string
  open: boolean
  media: Attachment[]
  onClose: () => void
  call: CallInChat | null
  inCall: boolean
  onCall: (kind: 'voice' | 'video') => void
  onSearch: () => void
  onToggleTranslation: () => void
  onSetMyLanguage: (language: string) => void
  onToggleMute: () => void
  onToggleArchive: () => void
  onBlock: () => void
  onLeave: () => void
  onAddMember: (pin: string) => Promise<boolean>
  onMemberAction: (action: MemberAction, member: Member) => void
  onUnban: (userId: string, name: string) => void
  onOpenMedia: (attachment?: Attachment) => void
  onJumpToMessage: (messageId: string) => void
  onUnpin: (messageId: string) => void
  notify: (message: string) => void
}

export function DetailsPanel({
  chat,
  myLanguage,
  open,
  media,
  call,
  inCall,
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
  onMemberAction,
  onUnban,
  onOpenMedia,
  onJumpToMessage,
  onUnpin,
  notify,
}: DetailsPanelProps) {
  const name = firstName(chat.name)
  const preview = media.slice(-3).reverse()
  const callsOff = chat.blocked || chat.blockedMe
  const panelRef = useRef<HTMLElement>(null)
  const pins = usePinnedMessages(chat.id as Id<'conversations'>)
  useSwipeToClose(panelRef, 'right', open, onClose)

  return (
    <aside ref={panelRef} className={`details-panel ${open ? 'details-open' : ''}`} aria-label="Chat details">
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
        {call ? (
          <button type="button" className={`detail-join-call ${inCall ? 'is-joined' : ''}`} onClick={() => onCall(call.kind)}>
            {call.kind === 'video' ? <Video /> : <Phone />}<span>{inCall ? 'Return to call' : 'Join call'}</span>
          </button>
        ) : (
          <>
            <button type="button" disabled={callsOff} onClick={() => onCall('voice')}><Phone /><span>Call</span></button>
            <button type="button" disabled={callsOff} onClick={() => onCall('video')}><Video /><span>Video</span></button>
          </>
        )}
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
        <GroupMembers chat={chat} myLanguage={myLanguage} onAddMember={onAddMember} onMemberAction={onMemberAction} onUnban={onUnban} notify={notify} />
      )}

      {pins.length > 0 && (
        <div className="detail-section pinned-list">
          <h3><Pin /> Pinned messages <small>{pins.length}</small></h3>
          <ul>
            {pins.map((pin) => (
              <li key={pin._id}>
                <button type="button" className="pinned-item" onClick={() => onJumpToMessage(pin._id)}>
                  <strong>{firstName(pin.senderName)}</strong>
                  <span>{pin.summary}</span>
                </button>
                {canPinIn(chat) && (
                  <button type="button" className="icon-button" aria-label={`Unpin message from ${pin.senderName}`} onClick={() => onUnpin(pin._id)}><PinOff /></button>
                )}
              </li>
            ))}
          </ul>
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
                {attachment.kind === 'image' && attachment.url ? <img src={attachment.url} alt="" width={64} height={64} loading="lazy" decoding="async" /> : attachment.kind === 'audio' ? <Mic /> : <FileText />}
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
