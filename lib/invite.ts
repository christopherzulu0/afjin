import { normalizePin, pinPattern } from './chat-data'

const codePattern = /^[A-Z0-9]{10}$/

export type InviteTarget = { kind: 'invite'; code: string } | { kind: 'pin'; pin: string }

export function inviteUrl(code: string) {
  const origin = typeof window === 'undefined' ? '' : window.location.origin
  return `${origin}/invite/${code}`
}

export function inviteHref(target: InviteTarget) {
  return target.kind === 'invite' ? `/invite/${target.code}` : `/chat?pin=${target.pin}`
}

export async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

export function canShare() {
  return typeof navigator !== 'undefined' && typeof navigator.share === 'function'
}

export async function shareLink(url: string, title: string) {
  try {
    await navigator.share({ title, text: title, url })
    return true
  } catch {
    return false
  }
}

/** Reads an afjini invite URL, a bare invite code, or a PIN from scanned or pasted text. */
export function parseInviteInput(text: string): InviteTarget | null {
  const value = text.trim()
  if (!value) return null
  const pin = normalizePin(value)
  if (pinPattern.test(pin)) return { kind: 'pin', pin }

  let candidate = value
  try {
    candidate = new URL(value).pathname
  } catch {}
  if (candidate.includes('/')) candidate = candidate.match(/^\/?invite\/([A-Za-z0-9]+)\/?$/)?.[1] ?? ''
  const code = candidate.toUpperCase()
  return codePattern.test(code) ? { kind: 'invite', code } : null
}
