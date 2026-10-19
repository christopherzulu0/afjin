import { v } from 'convex/values'
import { internal } from './_generated/api'
import { internalAction, internalMutation } from './_generated/server'
import { firstUrl, isSafeUrl, parseMetadata } from './lib/linkPreview'
import { linkPreviewValidator } from './schema'

const TIMEOUT_MS = 5_000
const MAX_BYTES = 512 * 1024
const MAX_REDIRECTS = 3

async function readCapped(response: Response) {
  const reader = response.body?.getReader()
  if (!reader) return ''
  const chunks: Uint8Array[] = []
  let total = 0
  while (total < MAX_BYTES) {
    const { done, value } = await reader.read()
    if (done || !value) break
    chunks.push(value)
    total += value.byteLength
  }
  await reader.cancel().catch(() => undefined)
  const bytes = new Uint8Array(Math.min(total, MAX_BYTES))
  let offset = 0
  for (const chunk of chunks) {
    const slice = chunk.subarray(0, Math.min(chunk.byteLength, bytes.length - offset))
    bytes.set(slice, offset)
    offset += slice.byteLength
    if (offset >= bytes.length) break
  }
  return new TextDecoder().decode(bytes)
}

/** Follows redirects by hand so every hop is checked against the private-address rules. */
async function fetchPage(start: string) {
  let url = start
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
      if (!isSafeUrl(url)) return null
      const response = await fetch(url, {
        redirect: 'manual',
        signal: controller.signal,
        headers: { 'user-agent': 'afjiniBot/1.0 (link preview)', accept: 'text/html,application/xhtml+xml' },
      })
      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get('location')
        if (!location) return null
        url = new URL(location, url).toString()
        continue
      }
      if (!response.ok || !(response.headers.get('content-type') ?? '').includes('html')) return null
      return { url, html: await readCapped(response) }
    }
    return null
  } finally {
    clearTimeout(timer)
  }
}

export const fetchPreview = internalAction({
  args: { messageId: v.id('messages'), url: v.string() },
  handler: async (ctx, { messageId, url }) => {
    let page: { url: string; html: string } | null = null
    try {
      page = await fetchPage(url)
    } catch {
      return null
    }
    const preview = page ? parseMetadata(page.html, page.url) : null
    if (preview) await ctx.runMutation(internal.linkPreviews.save, { messageId, url, preview: { ...preview, url } })
    return null
  },
})

export const save = internalMutation({
  args: { messageId: v.id('messages'), url: v.string(), preview: linkPreviewValidator },
  handler: async (ctx, { messageId, url, preview }) => {
    const message = await ctx.db.get('messages', messageId)
    // The message may have been edited or deleted while the page was loading.
    if (!message || message.deletedAt || firstUrl(message.body) !== url) return null
    await ctx.db.patch('messages', messageId, { linkPreview: preview })
    return null
  },
})
