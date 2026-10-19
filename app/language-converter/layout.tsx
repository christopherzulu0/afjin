import type { ReactNode } from 'react'
import { pageMetadata } from '@/lib/site'

export const metadata = pageMetadata({
  title: 'Language converter',
  description: 'Try afjini translation for free: convert everyday phrases between English, Spanish, French, Arabic, Hindi and more, and hear them read aloud.',
  path: '/language-converter',
})

export default function LanguageConverterLayout({ children }: { children: ReactNode }) {
  return children
}
