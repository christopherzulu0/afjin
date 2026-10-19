import type { MetadataRoute } from 'next'
import { SITE_DESCRIPTION } from '@/lib/site'
import { THEME_COLORS } from '@/lib/theme'

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/chat',
    name: 'afjini — translated chat',
    short_name: 'afjini',
    description: SITE_DESCRIPTION,
    start_url: '/chat',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: THEME_COLORS.dark,
    theme_color: THEME_COLORS.dark,
    categories: ['social', 'communication'],
    icons: [
      { src: '/icons/192', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/512', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/maskable', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
