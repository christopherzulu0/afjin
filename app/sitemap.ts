import type { MetadataRoute } from 'next'
import { LEGAL } from '@/lib/legal'
import { absoluteUrl } from '@/lib/site'

type Entry = { path: string; changeFrequency: NonNullable<MetadataRoute.Sitemap[number]['changeFrequency']>; priority: number; legal?: boolean }

const PAGES: Entry[] = [
  { path: '/', changeFrequency: 'weekly', priority: 1 },
  { path: '/features', changeFrequency: 'weekly', priority: 0.9 },
  { path: '/how-it-works', changeFrequency: 'monthly', priority: 0.8 },
  { path: '/language-converter', changeFrequency: 'monthly', priority: 0.7 },
  { path: '/privacy', changeFrequency: 'yearly', priority: 0.5 },
  { path: '/privacy/policy', changeFrequency: 'yearly', priority: 0.3, legal: true },
  { path: '/terms', changeFrequency: 'yearly', priority: 0.3, legal: true },
]

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date()
  const legalUpdated = new Date(`${LEGAL.updated}T00:00:00Z`)
  return PAGES.map(({ path, changeFrequency, priority, legal }) => ({
    url: absoluteUrl(path),
    lastModified: legal ? legalUpdated : now,
    changeFrequency,
    priority,
  }))
}
