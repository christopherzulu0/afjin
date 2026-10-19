'use client'

import { useQuery } from 'convex/react'
import { Bell, Check, ChevronDown, Copy, Download, Globe2, Inbox, MessageCirclePlus, Pin, QrCode, ScanQrCode, Share2, Users, X } from 'lucide-react'
import { api } from '@/convex/_generated/api'
import { useInstallPrompt } from '@/hooks/use-install-prompt'
import { useOnboarding } from '@/hooks/use-onboarding'
import type { Conversation } from '@/lib/chat-data'
import { firstName, listTime } from '@/lib/chat-format'
import { languages } from '@/lib/speech'
import { Avatar } from './avatar'
import type { InviteTab } from './invite-dialog'
import type { PushStatus } from './sidebar'

const LIST_LIMIT = 5

type ChatHomeProps = {
  me: { name: string; pin: string; inviteCode?: string }
  myLanguage: string
  inbox: Conversation[]
  hasChats: boolean
  unreadChats: Conversation[]
  typingIn: string | null
  pushStatus: PushStatus
  onSelectChat: (conversationId: string) => void
  onOpenPin: (conversationId: string, messageId: string) => void
  onNewChat: (tab: 'direct' | 'group') => void
  onInvite: (tab: InviteTab) => void
  onEnablePush: () => void
  onCopyPin: () => void
  onSetLanguage: (language: string) => void
  onInstallHelp: () => void
  onOpenList: () => void
}

function greeting() {
  const hour = new Date().getHours()
  if (hour < 5) return 'Good night'
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

type Step = { id: string; title: string; detail: string; done: boolean; action?: { label: string; onClick: () => void; disabled?: boolean } }

export function ChatHome({
  me,
  myLanguage,
  inbox,
  hasChats,
  unreadChats,
  typingIn,
  pushStatus,
  onSelectChat,
  onOpenPin,
  onNewChat,
  onInvite,
  onEnablePush,
  onCopyPin,
  onSetLanguage,
  onInstallHelp,
  onOpenList,
}: ChatHomeProps) {
  const { flags, mark } = useOnboarding()
  const install = useInstallPrompt()
  const pins = useQuery(api.messages.recentPinned, {}) ?? []
  const recent = inbox.slice(0, LIST_LIMIT)

  const steps: Step[] = [
    {
      id: 'language',
      title: 'Confirm your reading language',
      detail: `Messages from others will be translated into ${myLanguage}.`,
      done: flags.languageConfirmed,
      action: { label: 'Looks right', onClick: () => mark('languageConfirmed') },
    },
    {
      id: 'invite',
      title: 'Share your invite link or PIN',
      detail: 'People can only reach you with your PIN, invite link or QR code.',
      done: Boolean(me.inviteCode) || flags.pinShared,
      action: { label: 'Share invite', onClick: () => onInvite('share') },
    },
    {
      id: 'chat',
      title: 'Start your first chat',
      detail: 'Add someone by their PIN, or create a group.',
      done: hasChats,
      action: { label: 'New chat', onClick: () => onNewChat('direct') },
    },
  ]
  if (pushStatus !== 'unsupported' && pushStatus !== 'unconfigured') {
    steps.push({
      id: 'push',
      title: 'Turn on notifications',
      detail: pushStatus === 'denied' ? 'Notifications are blocked in your browser settings.' : 'Get a notification for new messages and calls, even when afjini is closed.',
      done: pushStatus === 'enabled',
      action: { label: 'Turn on', onClick: onEnablePush, disabled: pushStatus === 'denied' || pushStatus === 'working' },
    })
  }
  if (install.installed || install.canPrompt || install.showIosHint) {
    steps.push({
      id: 'install',
      title: 'Install afjini',
      detail: 'Open it from your home screen or dock like any other app.',
      done: install.installed,
      action: { label: 'Install', onClick: () => (install.canPrompt ? void install.install() : onInstallHelp()) },
    })
  }
  const doneCount = steps.filter((step) => step.done).length
  const showChecklist = !flags.dismissed && doneCount < steps.length

  return (
    <div className="chat-home" aria-labelledby="chat-home-title">
      <header className="home-hero">
        <div className="home-hero-copy">
          <span className="home-kicker">{greeting()}</span>
          <h1 id="chat-home-title">{firstName(me.name)}, who are you talking to today?</h1>
          <p><Globe2 aria-hidden /> Write in your own language. Everyone reads your messages in theirs, with the original one tap away.</p>
        </div>
        <div className="home-identity">
          <button
            type="button"
            className="home-pin"
            onClick={() => {
              onCopyPin()
              mark('pinShared')
            }}
            aria-label={`Copy your PIN ${me.pin}`}
          >
            <small>Your PIN</small>
            <b>{me.pin}</b>
            <Copy aria-hidden />
          </button>
          <label className="home-language">
            <small>I read in</small>
            <span className="language-button">
              <select
                value={myLanguage}
                onChange={(event) => {
                  onSetLanguage(event.target.value)
                  mark('languageConfirmed')
                }}
                aria-label="Your reading language"
              >
                {languages.map((language) => <option key={language}>{language}</option>)}
              </select>
              <ChevronDown aria-hidden />
            </span>
          </label>
        </div>
      </header>

      <nav className="home-actions" aria-label="Quick actions">
        <button type="button" onClick={() => onNewChat('direct')}>
          <MessageCirclePlus aria-hidden /><span><strong>New chat</strong><small>Message someone by PIN</small></span>
        </button>
        <button type="button" onClick={() => onNewChat('group')}>
          <Users aria-hidden /><span><strong>New group</strong><small>Family, friends or a team</small></span>
        </button>
        <button type="button" onClick={() => onInvite('share')}>
          <QrCode aria-hidden /><span><strong>Share invite</strong><small>Link or QR code</small></span>
        </button>
        <button type="button" onClick={() => onInvite('scan')}>
          <ScanQrCode aria-hidden /><span><strong>Scan a QR code</strong><small>Add someone in person</small></span>
        </button>
      </nav>

      <div className="home-grid">
        <div className="home-column">
          {showChecklist && (
            <section className="home-card home-checklist" aria-labelledby="home-checklist-title">
              <div className="home-card-head">
                <h2 id="home-checklist-title">Getting started</h2>
                <span className="home-progress-label">{doneCount} of {steps.length} done</span>
                <button type="button" className="icon-button" aria-label="Hide getting started" onClick={() => mark('dismissed')}><X /></button>
              </div>
              <div
                className="home-progress"
                role="progressbar"
                aria-label="Getting started progress"
                aria-valuemin={0}
                aria-valuemax={steps.length}
                aria-valuenow={doneCount}
              >
                <span style={{ width: `${(doneCount / steps.length) * 100}%` }} />
              </div>
              <ol className="home-steps">
                {steps.map((step) => (
                  <li key={step.id} className={step.done ? 'is-done' : ''}>
                    <span className="home-step-mark" aria-hidden>{step.done ? <Check /> : null}</span>
                    <span className="home-step-copy">
                      <strong>{step.title}</strong>
                      <small>{step.detail}</small>
                    </span>
                    {step.done ? (
                      <span className="sr-only">Done</span>
                    ) : step.action && (
                      <button type="button" className="home-step-action" onClick={step.action.onClick} disabled={step.action.disabled}>
                        {step.id === 'push' ? <Bell aria-hidden /> : step.id === 'install' ? <Download aria-hidden /> : step.id === 'invite' ? <Share2 aria-hidden /> : null}
                        {step.action.label}
                      </button>
                    )}
                  </li>
                ))}
              </ol>
            </section>
          )}

          <section className="home-card" aria-labelledby="home-unread-title">
            <div className="home-card-head">
              <h2 id="home-unread-title">Unread</h2>
              {unreadChats.length > 0 && <span className="home-count">{unreadChats.length}</span>}
            </div>
            {unreadChats.length ? (
              <ul className="home-list">
                {unreadChats.slice(0, LIST_LIMIT).map((chat) => (
                  <li key={chat.id}><ChatRow chat={chat} typing={typingIn === chat.id} onSelect={onSelectChat} /></li>
                ))}
              </ul>
            ) : (
              <p className="home-empty"><Inbox aria-hidden /> You&apos;re all caught up.</p>
            )}
          </section>
        </div>

        <div className="home-column">
          {hasChats ? (
            <>
              <section className="home-card" aria-labelledby="home-recent-title">
                <div className="home-card-head">
                  <h2 id="home-recent-title">Recent chats</h2>
                  <button type="button" className="home-link mobile-only" onClick={onOpenList}>See all</button>
                </div>
                <ul className="home-list">
                  {recent.map((chat) => (
                    <li key={chat.id}><ChatRow chat={chat} typing={typingIn === chat.id} onSelect={onSelectChat} /></li>
                  ))}
                </ul>
              </section>

              <section className="home-card" aria-labelledby="home-pins-title">
                <div className="home-card-head">
                  <h2 id="home-pins-title">Pinned messages</h2>
                </div>
                {pins.length ? (
                  <ul className="home-list">
                    {pins.map((pin) => (
                      <li key={pin._id}>
                        <button type="button" className="home-pin-row" onClick={() => onOpenPin(pin.conversationId, pin._id)}>
                          <Pin aria-hidden />
                          <span>
                            <strong>{pin.chatName}</strong>
                            <small>{pin.group ? `${firstName(pin.senderName)}: ` : ''}{pin.summary}</small>
                          </span>
                          <time dateTime={new Date(pin.pinnedAt).toISOString()}>{listTime(pin.pinnedAt)}</time>
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="home-empty"><Pin aria-hidden /> Pin important messages in any chat to keep them here.</p>
                )}
              </section>
            </>
          ) : (
            <section className="home-card home-explainer" aria-labelledby="home-how-title">
              <h2 id="home-how-title">How afjini works</h2>
              <ol>
                <li><span aria-hidden>1</span><div><strong>Share your PIN or invite</strong><small>Send it to the people you want to talk to.</small></div></li>
                <li><span aria-hidden>2</span><div><strong>Write in your language</strong><small>No switching apps, no copy and paste.</small></div></li>
                <li><span aria-hidden>3</span><div><strong>They read it in theirs</strong><small>Translated automatically, with the original one tap away.</small></div></li>
              </ol>
              <button type="button" className="modal-primary" onClick={() => onNewChat('direct')}><MessageCirclePlus aria-hidden /> Start a chat</button>
            </section>
          )}
        </div>
      </div>
    </div>
  )
}

function ChatRow({ chat, typing, onSelect }: { chat: Conversation; typing: boolean; onSelect: (id: string) => void }) {
  return (
    <button type="button" className="home-chat-row" onClick={() => onSelect(chat.id)}>
      <Avatar initials={chat.initials} color={chat.color} imageUrl={chat.imageUrl} online={chat.online && !chat.blocked} small />
      <span className="home-chat-copy">
        <strong>{chat.name}</strong>
        <small className={typing ? 'is-typing' : ''}>{typing ? 'typing…' : chat.preview}</small>
      </span>
      <span className="home-chat-meta">
        <time>{listTime(chat.lastMessageAt)}</time>
        {chat.unread > 0 && <b aria-label={`${chat.unread} unread`}>{chat.unread}</b>}
      </span>
    </button>
  )
}
