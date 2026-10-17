import type { Message } from '@/lib/chat-data'

const DAY = 86_400_000
const timeFormat = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' })
const weekdayLong = new Intl.DateTimeFormat('en-US', { weekday: 'long' })
const weekdayShort = new Intl.DateTimeFormat('en-US', { weekday: 'short' })
const shortDate = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' })

export function startOfDay(timestamp: number) {
  const date = new Date(timestamp)
  date.setHours(0, 0, 0, 0)
  return date.getTime()
}

function daysBetween(timestamp: number, now: number) {
  return Math.round((startOfDay(now) - startOfDay(timestamp)) / DAY)
}

export function formatTime(timestamp: number) {
  return timeFormat.format(timestamp)
}

export function dayLabel(timestamp: number, now = Date.now()) {
  const days = daysBetween(timestamp, now)
  if (days <= 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 7) return weekdayLong.format(timestamp)
  return shortDate.format(timestamp)
}

export function listTime(timestamp: number, now = Date.now()) {
  const days = daysBetween(timestamp, now)
  if (days <= 0) return formatTime(timestamp)
  if (days === 1) return 'Yesterday'
  if (days < 7) return weekdayShort.format(timestamp)
  return shortDate.format(timestamp)
}

export function formatDuration(seconds: number) {
  const safe = Math.max(0, Math.round(seconds))
  return `${Math.floor(safe / 60)}:${String(safe % 60).padStart(2, '0')}`
}

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function firstName(name: string) {
  return name.split(' ')[0]
}

export function messageSummary(message: Pick<Message, 'deleted' | 'attachments' | 'text'>) {
  if (message.deleted) return 'Message deleted'
  const attachment = message.attachments[0]
  if (attachment?.kind === 'audio') return '🎤 Voice message'
  if (message.text) return message.text
  if (attachment?.kind === 'image') return '📷 Photo'
  if (attachment) return `📎 ${attachment.name}`
  return ''
}
