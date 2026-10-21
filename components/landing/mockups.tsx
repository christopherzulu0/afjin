import type { ReactNode } from 'react'
import {
  BatteryFull,
  Bell,
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  Copy,
  Globe2,
  Image as ImageIcon,
  Languages,
  Mic,
  MicOff,
  Moon,
  MoreVertical,
  Paperclip,
  Phone,
  PhoneMissed,
  PhoneOff,
  Pin,
  Play,
  Plus,
  Reply,
  Search,
  Share2,
  ShieldCheck,
  Signal,
  Smile,
  Video,
  Wifi,
} from 'lucide-react'
import { BrandMark } from '@/components/brand-mark'

type AvatarColor = 'coral' | 'blue' | 'purple' | 'yellow' | 'green' | 'teal'
type ChatRow = { name: string; initials: string; color: AvatarColor; preview: string; time: string; unread?: number; online?: boolean; kind?: 'typing' | 'translated' | 'voice' | 'photo' | 'missed' }

const DEMO = {
  pin: 'AFJ-7K2P',
  chats: [
    { name: 'Maya Rodriguez', initials: 'MR', color: 'coral', preview: 'Absolutely, see you at ten!', time: '12:45', unread: 2, online: true },
    { name: 'Family circle', initials: 'FC', color: 'purple', preview: 'Amara is typing…', time: '12:40', kind: 'typing' },
    { name: 'Kenji Sato', initials: 'KS', color: 'blue', preview: 'From Japanese: See you tomorrow', time: '11:22', online: true, kind: 'translated' },
    { name: 'Amara Okafor', initials: 'AO', color: 'yellow', preview: 'Voice message · 0:18', time: '10:18', kind: 'voice' },
    { name: 'Studio team', initials: 'ST', color: 'green', preview: 'Lucas: Photo', time: '9:51', unread: 5, kind: 'photo' },
    { name: 'Lucas Martin', initials: 'LM', color: 'teal', preview: 'Missed voice call', time: 'Yesterday', kind: 'missed' },
    { name: 'Sofia Rossi', initials: 'SR', color: 'coral', preview: 'Thank you so much!', time: 'Mon', online: true },
  ] satisfies ChatRow[],
  callers: [
    { name: 'Maya', initials: 'MR', color: 'coral', language: 'ES', speaking: true },
    { name: 'Kenji', initials: 'KS', color: 'blue', language: 'JA' },
    { name: 'Amara', initials: 'AO', color: 'yellow', language: 'EN' },
    { name: 'You', initials: 'AM', color: 'purple', language: 'EN' },
  ] satisfies { name: string; initials: string; color: AvatarColor; language: string; speaking?: boolean }[],
}

const WAVE = [6, 12, 18, 10, 22, 14, 8, 16, 24, 12, 6, 18, 10, 20, 8, 14, 6, 10]
const QR = ['1110101', '1010110', '1110011', '0001100', '1101011', '0110110', '1011101']

function Avatar({ initials, color, online = false, size = 'md' }: { initials: string; color: AvatarColor; online?: boolean; size?: 'sm' | 'md' | 'lg' }) {
  return (
    <span className={`mock-avatar mock-avatar-${size} avatar-${color}`}>
      {initials}
      {online && <i className="mock-online" />}
    </span>
  )
}

function Mockup({ label, className, children }: { label: string; className: string; children: ReactNode }) {
  return (
    <div className={className} role="img" aria-label={label}>
      <div className="mock-inner" aria-hidden="true">{children}</div>
    </div>
  )
}

export function PhoneFrame({ label, className = '', children }: { label: string; className?: string; children: ReactNode }) {
  return (
    <Mockup label={label} className={`mock-phone ${className}`.trim()}>
      <div className="mock-screen">
        <div className="mock-status">
          <span>9:41</span>
          <span className="mock-notch" />
          <span className="mock-status-icons"><Signal /><Wifi /><BatteryFull /></span>
        </div>
        {children}
      </div>
    </Mockup>
  )
}

function Waveform({ bars = WAVE }: { bars?: number[] }) {
  return <span className="mock-wave">{bars.map((height, index) => <i key={index} style={{ height }} />)}</span>
}

function MiniQr() {
  return (
    <span className="mock-qr">
      {QR.flatMap((row, y) => row.split('').map((cell, x) => <i key={`${x}-${y}`} className={cell === '1' ? 'is-on' : ''} />))}
    </span>
  )
}

function ChatPreviewIcon({ kind }: { kind: ChatRow['kind'] }) {
  if (kind === 'translated') return <Globe2 />
  if (kind === 'voice') return <Mic />
  if (kind === 'photo') return <ImageIcon />
  if (kind === 'missed') return <PhoneMissed />
  return null
}

export function ChatListScreen() {
  return (
    <div className="mock-app">
      <div className="mock-topbar">
        <BrandMark size={26} />
        <strong>Chats</strong>
        <span className="mock-icon-button"><MoreVertical /></span>
      </div>
      <div className="mock-search"><Search /> Search chats</div>
      <div className="mock-tabs"><span className="is-active">All</span><span>Unread</span><span>Groups</span></div>
      <ul className="mock-chat-list">
        {DEMO.chats.map((chat) => (
          <li key={chat.name}>
            <Avatar initials={chat.initials} color={chat.color} online={chat.online} />
            <span className="mock-chat-copy">
              <span className="mock-chat-top"><strong>{chat.name}</strong><small>{chat.time}</small></span>
              <span className={`mock-chat-preview ${chat.kind ? `is-${chat.kind}` : ''}`}>
                <ChatPreviewIcon kind={chat.kind} />
                <span>{chat.preview}</span>
                {chat.unread && <b>{chat.unread}</b>}
              </span>
            </span>
          </li>
        ))}
      </ul>
      <span className="mock-fab"><Plus /></span>
    </div>
  )
}

export function ConversationScreen() {
  return (
    <div className="mock-app">
      <div className="mock-convo-head">
        <ChevronLeft />
        <Avatar initials="MR" color="coral" online size="sm" />
        <span className="mock-convo-title"><strong>Maya Rodriguez</strong><small>Online</small></span>
        <span className="mock-convo-actions"><Phone /><Video /></span>
      </div>
      <div className="mock-translate-banner"><Globe2 /><span>Translating <b>Spanish → English</b></span><em>ON</em></div>
      <div className="mock-thread">
        <span className="mock-day">Today</span>
        <div className="mock-bubble">
          Are we still on for coffee tomorrow?
          <small>9:34 · Translated from Spanish · <u>See original</u></small>
        </div>
        <div className="mock-bubble is-mine">
          Absolutely. I found a new place near the park.
          <small>9:36 <CheckCheck /></small>
          <span className="mock-reaction">❤️ 1</span>
        </div>
        <div className="mock-bubble mock-voice">
          <span className="mock-play"><Play /></span>
          <Waveform />
          <small>0:18</small>
        </div>
        <div className="mock-bubble mock-photo-bubble">
          <span className="mock-photo" />
          The view from the terrace!
          <small>9:41</small>
        </div>
        <div className="mock-typing"><i /><i /><i /></div>
      </div>
      <div className="mock-composer">
        <Smile />
        <span>Message</span>
        <Paperclip />
        <span className="mock-send"><Mic /></span>
      </div>
    </div>
  )
}

export function CallScreen() {
  return (
    <div className="mock-app mock-call">
      <div className="mock-call-head">
        <ChevronLeft />
        <span><strong>Family circle</strong><small>Group call · 12:04</small></span>
        <em><Languages /> Live translation</em>
      </div>
      <div className="mock-call-grid">
        {DEMO.callers.map((caller) => (
          <div key={caller.name} className={`mock-tile ${caller.speaking ? 'is-speaking' : ''}`}>
            <Avatar initials={caller.initials} color={caller.color} size="lg" />
            <span className="mock-tile-name">{caller.name} <small>{caller.language}</small></span>
          </div>
        ))}
      </div>
      <p className="mock-caption"><b>Maya</b> “We land at six. See you at the airport!”</p>
      <div className="mock-call-controls">
        <span><MicOff /></span>
        <span><Video /></span>
        <span className="is-hangup"><PhoneOff /></span>
      </div>
    </div>
  )
}

export function ProfileScreen() {
  return (
    <div className="mock-app">
      <div className="mock-topbar">
        <BrandMark size={26} />
        <strong>Account</strong>
        <span className="mock-icon-button"><MoreVertical /></span>
      </div>
      <div className="mock-profile">
        <Avatar initials="AM" color="purple" size="lg" online />
        <span><strong>Alex Morgan</strong><small><i /> Online · reads English</small></span>
      </div>
      <div className="mock-pin-card">
        <small>Your afjini PIN</small>
        <strong>{DEMO.pin}</strong>
        <div className="mock-pin-actions">
          <span className="is-primary"><Copy /> Copy PIN</span>
          <span><Share2 /> Share</span>
        </div>
      </div>
      <div className="mock-qr-row">
        <MiniQr />
        <span><strong>Scan to add me</strong><small>No phone number needed</small></span>
      </div>
      <ul className="mock-settings">
        <li><Languages /> Reading language <small>English</small><ChevronRight /></li>
        <li><Bell /> Notifications <small>On</small><ChevronRight /></li>
        <li><ShieldCheck /> Privacy &amp; security<ChevronRight /></li>
        <li><Moon /> Theme <small>Dark</small><ChevronRight /></li>
      </ul>
    </div>
  )
}

export function DesktopMockup() {
  return (
    <Mockup label="The afjini desktop app: chat list, a translated group conversation and the chat details panel" className="mock-desktop">
      <div className="mock-window-top"><span /><span /><span /><b>afjini.app/chat</b></div>
      <div className="mock-desktop-body">
        <aside className="mock-desktop-sidebar">
          <div className="mock-topbar"><BrandMark size={24} /><strong>afjini</strong></div>
          <div className="mock-search"><Search /> Search</div>
          <ul className="mock-chat-list">
            {DEMO.chats.slice(0, 5).map((chat, index) => (
              <li key={chat.name} className={index === 4 ? 'is-active' : ''}>
                <Avatar initials={chat.initials} color={chat.color} online={chat.online} size="sm" />
                <span className="mock-chat-copy">
                  <span className="mock-chat-top"><strong>{chat.name}</strong><small>{chat.time}</small></span>
                  <span className="mock-chat-preview"><span>{chat.preview}</span></span>
                </span>
              </li>
            ))}
          </ul>
        </aside>
        <section className="mock-desktop-chat">
          <div className="mock-convo-head">
            <Avatar initials="ST" color="green" size="sm" />
            <span className="mock-convo-title"><strong>Studio team</strong><small>Maya, Kenji, Lucas and you</small></span>
            <span className="mock-convo-actions"><Phone /><Video /></span>
          </div>
          <div className="mock-pinned"><Pin /><span><b>Pinned</b> Launch review moved to Thursday 3 PM</span></div>
          <div className="mock-thread">
            <div className="mock-bubble">
              <b className="mock-sender">Kenji</b>
              The new designs are ready for review.
              <small>10:02 · Translated from Japanese</small>
            </div>
            <div className="mock-bubble">
              <b className="mock-sender">Maya</b>
              Love the colours. Can we try a darker header?
              <small>10:04 · Translated from Spanish</small>
              <span className="mock-reaction">👍 2</span>
            </div>
            <div className="mock-bubble is-mine">
              <span className="mock-quote"><Reply /> Maya: Can we try a darker header?</span>
              On it. I&apos;ll share a version this afternoon.
              <small>10:06 <CheckCheck /></small>
            </div>
          </div>
          <div className="mock-composer"><Smile /><span>Message Studio team</span><Paperclip /><span className="mock-send"><Mic /></span></div>
        </section>
        <aside className="mock-desktop-details">
          <Avatar initials="ST" color="green" size="lg" />
          <strong>Studio team</strong>
          <small>4 members · 3 languages</small>
          <span className="mock-details-label">Shared media</span>
          <div className="mock-media"><i /><i /><i /><i /><i /><i /></div>
          <span className="mock-details-label">Members</span>
          <div className="mock-members">
            {DEMO.callers.map((caller) => <Avatar key={caller.name} initials={caller.initials} color={caller.color} size="sm" />)}
          </div>
        </aside>
      </div>
    </Mockup>
  )
}

/* Small UI snippets for the feature cards. */

export function TranslationSnippet() {
  return (
    <div className="mock-inner mock-snippet" aria-hidden="true">
      <div className="mock-bubble">¿Nos vemos a las diez?<small>Original · Spanish</small></div>
      <div className="mock-bubble is-mine">See you at ten?<small>Translated · English</small></div>
    </div>
  )
}

export function VoiceSnippet() {
  return (
    <div className="mock-inner mock-snippet" aria-hidden="true">
      <div className="mock-bubble mock-voice is-mine"><span className="mock-play"><Play /></span><Waveform bars={WAVE.slice(0, 14)} /><small>0:24</small></div>
    </div>
  )
}

export function ReplySnippet() {
  return (
    <div className="mock-inner mock-snippet" aria-hidden="true">
      <div className="mock-bubble is-mine">
        <span className="mock-quote"><Reply /> Kenji: Dinner on Friday?</span>
        Count me in!
        <span className="mock-reaction">🎉 3</span>
      </div>
    </div>
  )
}

export function PinnedSnippet() {
  return (
    <div className="mock-inner mock-snippet" aria-hidden="true">
      <div className="mock-pinned"><Pin /><span><b>Pinned</b> Flight AF 1234 lands 18:05</span></div>
      <div className="mock-bubble">Who is picking up grandma?<small>Family circle</small></div>
    </div>
  )
}

export function PinSnippet() {
  return (
    <div className="mock-inner mock-snippet mock-snippet-row" aria-hidden="true">
      <MiniQr />
      <span className="mock-pin-chip"><small>afjini PIN</small><strong>{DEMO.pin}</strong></span>
    </div>
  )
}

export function CallSnippet() {
  return (
    <div className="mock-inner mock-snippet mock-snippet-row" aria-hidden="true">
      <span className="mock-avatar-stack">
        {DEMO.callers.slice(0, 3).map((caller) => <Avatar key={caller.name} initials={caller.initials} color={caller.color} size="sm" />)}
      </span>
      <span className="mock-call-buttons"><span><Phone /></span><span><Video /></span><span className="is-hangup"><PhoneOff /></span></span>
    </div>
  )
}
