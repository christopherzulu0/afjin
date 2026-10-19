import type { Metadata } from 'next'

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000').replace(/\/+$/, '')
export const SITE_NAME = 'afjini'
export const SITE_TITLE = 'afjini — Talk freely. Understand instantly.'
export const SITE_TAGLINE = 'Talk freely. Understand instantly.'
export const SITE_DESCRIPTION =
  'Chat, call and share with anyone in your own language. afjini translates every message automatically and keeps the original one tap away.'

export function absoluteUrl(path = '/') {
  return `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`
}

type PageMetadataInput = {
  title: string
  description: string
  path: string
  /** Use the title as-is instead of the "%s · afjini" template. */
  absoluteTitle?: boolean
  noIndex?: boolean
}

/** Title, description, canonical URL and social cards for one page. */
export function pageMetadata({ title, description, path, absoluteTitle = false, noIndex = false }: PageMetadataInput): Metadata {
  const socialTitle = absoluteTitle ? title : `${title} · ${SITE_NAME}`
  if (noIndex) {
    return {
      title: absoluteTitle ? { absolute: title } : title,
      description,
      robots: { index: false, follow: false, googleBot: { index: false, follow: false } },
    }
  }
  return {
    title: absoluteTitle ? { absolute: title } : title,
    description,
    alternates: { canonical: path },
    openGraph: { type: 'website', siteName: SITE_NAME, locale: 'en', url: path, title: socialTitle, description },
    twitter: { card: 'summary_large_image', title: socialTitle, description },
  }
}
