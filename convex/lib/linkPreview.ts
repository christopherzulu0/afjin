const URL_PATTERN = /\bhttps?:\/\/[^\s<>"'`]+/i
const TRAILING_PUNCTUATION = /[.,!?;:)\]}'"]+$/
const MAX_TITLE = 200
const MAX_DESCRIPTION = 300

export type LinkPreviewData = { url: string; title: string; description?: string; image?: string; siteName?: string }

export function firstUrl(text: string) {
  const match = text.match(URL_PATTERN)
  return match ? match[0].replace(TRAILING_PUNCTUATION, '') : null
}

function isPrivateIPv4(host: string) {
  const parts = host.split('.').map(Number)
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return false
  const [a, b] = parts
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 198 && (b === 18 || b === 19)) ||
    a >= 224
  )
}

function isPrivateIPv6(host: string) {
  const value = host.replace(/^\[|\]$/g, '').toLowerCase()
  if (!value.includes(':')) return false
  if (value === '::' || value === '::1') return true
  if (value.startsWith('fc') || value.startsWith('fd') || value.startsWith('fe8') || value.startsWith('fe9') || value.startsWith('fea') || value.startsWith('feb')) return true
  const mapped = value.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/)
  return mapped ? isPrivateIPv4(mapped[1]) : false
}

/** Only fetch public http(s) URLs on default ports, never local or private network addresses. */
export function isSafeUrl(raw: string) {
  let url: URL
  try {
    url = new URL(raw)
  } catch {
    return false
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return false
  if (url.username || url.password) return false
  if (url.port && url.port !== '80' && url.port !== '443') return false
  const host = url.hostname.toLowerCase()
  if (!host || host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local') || host.endsWith('.internal')) return false
  if (!host.includes('.') && !host.includes(':')) return false
  return !isPrivateIPv4(host) && !isPrivateIPv6(host)
}

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' }

function decodeEntities(value: string) {
  return value.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (entity, code: string) => {
    if (code[0] === '#') {
      const point = code[1].toLowerCase() === 'x' ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10)
      return Number.isFinite(point) && point > 0 && point < 0x110000 ? String.fromCodePoint(point) : entity
    }
    return ENTITIES[code.toLowerCase()] ?? entity
  })
}

function clean(value: string | undefined, max: number) {
  if (!value) return undefined
  const text = decodeEntities(value).replace(/\s+/g, ' ').trim()
  if (!text) return undefined
  return text.length > max ? `${text.slice(0, max - 1)}…` : text
}

function metaContent(html: string, keys: string[]) {
  for (const tag of html.match(/<meta\b[^>]*>/gi) ?? []) {
    const name = tag.match(/\b(?:property|name)\s*=\s*["']([^"']+)["']/i)?.[1]?.toLowerCase()
    if (!name || !keys.includes(name)) continue
    const content = tag.match(/\bcontent\s*=\s*"([^"]*)"/i)?.[1] ?? tag.match(/\bcontent\s*=\s*'([^']*)'/i)?.[1]
    if (content) return content
  }
  return undefined
}

/** Pulls Open Graph / Twitter card / <title> metadata out of an HTML document. */
export function parseMetadata(html: string, pageUrl: string): LinkPreviewData | null {
  const head = html.slice(0, 200_000)
  const title = clean(metaContent(head, ['og:title', 'twitter:title']) ?? head.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1], MAX_TITLE)
  if (!title) return null
  const description = clean(metaContent(head, ['og:description', 'twitter:description', 'description']), MAX_DESCRIPTION)
  const siteName = clean(metaContent(head, ['og:site_name', 'application-name']), 80) ?? new URL(pageUrl).hostname.replace(/^www\./, '')
  let image: string | undefined
  const rawImage = metaContent(head, ['og:image', 'og:image:url', 'twitter:image'])
  if (rawImage) {
    try {
      const resolved = new URL(decodeEntities(rawImage), pageUrl).toString()
      if (resolved.startsWith('https://')) image = resolved
    } catch {}
  }
  return { url: pageUrl, title, description, image, siteName }
}
