export type AvatarColor = 'coral' | 'blue' | 'purple' | 'yellow' | 'green' | 'teal'

export type AttachmentKind = 'image' | 'file' | 'audio'

export type Attachment = {
  id: string
  kind: AttachmentKind
  name: string
  size: number
  url?: string | null
  duration?: number
}

export type Reaction = { emoji: string; by: 'me' | 'them' }

export type MessageStatus = 'sent' | 'delivered' | 'read'

export type TranslationState = 'none' | 'pending' | 'done' | 'unavailable'

export type ReplyPreview = { id: string; from: 'me' | 'them'; author: string; summary: string }

export type CallLog = { kind: 'voice' | 'video'; outcome: 'missed' | 'declined' | 'ended'; durationMs: number }

export type Message = {
  id: string
  from: 'me' | 'them'
  senderId: string
  author: string
  authorImage?: string | null
  text: string
  sourceLanguage: string
  translatedFrom: string
  translatedText?: string
  translationState: TranslationState
  outgoingTranslation?: string
  outgoingState: TranslationState
  createdAt: number
  status?: MessageStatus
  reactions: Reaction[]
  reply?: ReplyPreview
  attachments: Attachment[]
  edited?: boolean
  deleted?: boolean
  call?: CallLog
  pinned?: boolean
  forwarded?: boolean
  linkPreview?: LinkPreview
}

export type LinkPreview = { url: string; title: string; description?: string; image?: string; siteName?: string }

export type MemberRole = 'owner' | 'admin' | 'member'

export type Member = { id: string; name: string; initials: string; color: AvatarColor; language: string; imageUrl?: string | null; role: MemberRole }

export type Conversation = {
  id: string
  name: string
  initials: string
  color: AvatarColor
  imageUrl?: string | null
  pin?: string
  online: boolean
  group: boolean
  members: Member[]
  myRole: MemberRole
  language: string
  translationEnabled: boolean
  muted: boolean
  archived: boolean
  blocked: boolean
  blockedMe: boolean
  unread: number
  lastMessageAt: number
  lastReadAt: number
  preview: string
}

export const pinPattern = /^AFJ-[A-Z0-9]{4}$/

export function normalizePin(value: string) {
  return value.trim().toUpperCase()
}

const palette: AvatarColor[] = ['coral', 'blue', 'purple', 'yellow', 'green', 'teal']

export function colorFor(seed: string): AvatarColor {
  let hash = 0
  for (const char of seed) hash = (hash * 31 + char.charCodeAt(0)) >>> 0
  return palette[hash % palette.length]
}

export function initialsFor(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return '?'
  const letters = parts.length === 1 ? parts[0].slice(0, 2) : `${parts[0][0]}${parts[parts.length - 1][0]}`
  return letters.toUpperCase()
}

export function uid() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}
