import { OG_CONTENT_TYPE, OG_PAGES, OG_SIZE, renderOgImage } from '@/lib/og-image'

export const alt = OG_PAGES.privacy.alt
export const size = OG_SIZE
export const contentType = OG_CONTENT_TYPE

export default function Image() {
  return renderOgImage(OG_PAGES.privacy)
}
