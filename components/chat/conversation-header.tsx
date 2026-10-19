'use client'

import { useCallback, useRef, useState } from 'react'
import { Archive, ArchiveRestore, Ban, Bell, BellOff, Info, LogOut, Menu, MoreVertical, Phone, Search, Video } from 'lucide-react'
import type { CallInChat } from '@/hooks/use-calls'
import type { Conversation } from '@/lib/chat-data'
import { firstName } from '@/lib/chat-format'
import { useMenu } from '@/hooks/use-menu'
import { Avatar } from './avatar'

type ConversationHeaderProps = {
  chat: Conversation
  typingAuthor?: string
  onOpenList: () => void
  onOpenDetails: () => void
  call: CallInChat | null
  inCall: boolean
  onCall: (kind: 'voice' | 'video') => void
  onSearch: () => void
  onToggleMute: () => void
  onToggleArchive: () => void
  onBlock: () => void
  onLeave: () => void
}

export function ConversationHeader({ chat, typingAuthor, call, inCall, onOpenList, onOpenDetails, onCall, onSearch, onToggleMute, onToggleArchive, onBlock, onLeave }: ConversationHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const closeMenu = useCallback(() => setMenuOpen(false), [])
  useMenu(menuRef, menuOpen, closeMenu)

  let status = chat.online ? 'Online now' : 'Offline'
  if (chat.group) status = `${(chat.members?.length ?? 0) + 1} members · ${chat.members?.map((member) => firstName(member.name)).join(', ')}`
  if (typingAuthor) status = chat.group ? `${firstName(typingAuthor)} is typing…` : 'typing…'
  if (chat.blocked) status = 'Blocked'
  const callsOff = chat.blocked || chat.blockedMe

  function run(action: () => void) {
    action()
    closeMenu()
  }

  return (
    <header className="conversation-header">
      <button className="icon-button mobile-menu" aria-label="Open conversations" onClick={onOpenList}><Menu /></button>
      <button type="button" className="header-contact" onClick={onOpenDetails} aria-label={`Open details for ${chat.name}`}>
        <Avatar initials={chat.initials} color={chat.color} imageUrl={chat.imageUrl} online={chat.online && !chat.blocked} />
        <span className="contact-copy">
          <strong>{chat.name}</strong>
          <span className={`${typingAuthor ? 'is-typing' : ''} ${chat.online && !chat.group && !chat.blocked ? 'is-online' : ''}`}>
            {chat.online && !chat.group && !chat.blocked && !typingAuthor && <i />} {status}
          </span>
        </span>
      </button>
      <div className="header-actions">
        {call ? (
          <button type="button" className={`header-join-call ${inCall ? 'is-joined' : ''}`} onClick={() => onCall(call.kind)}>
            {call.kind === 'video' ? <Video /> : <Phone />} <span>{inCall ? 'In call' : 'Join call'}</span>
          </button>
        ) : (
          <>
            <button className="icon-button header-call" aria-label="Start video call" disabled={callsOff} onClick={() => onCall('video')}><Video /></button>
            <button className="icon-button header-call" aria-label="Start voice call" disabled={callsOff} onClick={() => onCall('voice')}><Phone /></button>
          </>
        )}
        <button className="icon-button header-info" aria-label="Conversation information" onClick={onOpenDetails}><Info /></button>
        <div className="menu-anchor" ref={menuRef}>
          <button className="icon-button" aria-label="More options" aria-expanded={menuOpen} onClick={() => setMenuOpen((open) => !open)}><MoreVertical /></button>
          {menuOpen && (
            <div className="popover-menu header-menu" role="menu">
              <button type="button" role="menuitem" onClick={() => run(onOpenDetails)}><Info /> Chat info</button>
              <button type="button" role="menuitem" onClick={() => run(onSearch)}><Search /> Search in chat</button>
              <button type="button" role="menuitem" onClick={() => run(onToggleMute)}>
                {chat.muted ? <Bell /> : <BellOff />} {chat.muted ? 'Unmute notifications' : 'Mute notifications'}
              </button>
              <button type="button" role="menuitem" onClick={() => run(onToggleArchive)}>
                {chat.archived ? <ArchiveRestore /> : <Archive />} {chat.archived ? 'Unarchive chat' : 'Archive chat'}
              </button>
              {chat.group ? (
                <button type="button" role="menuitem" className="danger" onClick={() => run(onLeave)}>
                  <LogOut /> Leave group
                </button>
              ) : (
                <button type="button" role="menuitem" className="danger" onClick={() => run(onBlock)}>
                  <Ban /> {chat.blocked ? `Unblock ${firstName(chat.name)}` : `Block ${firstName(chat.name)}`}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
