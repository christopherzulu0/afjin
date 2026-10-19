import { ClerkProvider } from '@clerk/nextjs'
import { shadcn } from '@clerk/ui/themes'
import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { DM_Sans, Playfair_Display } from 'next/font/google'
import { ConvexClientProvider } from '@/components/convex-client-provider'
import { ServiceWorkerRegister } from '@/components/sw-register'
import { SITE_DESCRIPTION, SITE_NAME, SITE_TITLE, SITE_URL } from '@/lib/site'
import { THEME_COLORS, themeBootScript } from '@/lib/theme'
import './globals.css'

const sans = DM_Sans({ subsets: ['latin'], weight: ['400', '500', '600', '700'], display: 'swap', variable: '--font-sans' })
const display = Playfair_Display({ subsets: ['latin'], weight: ['600', '700'], style: ['normal', 'italic'], display: 'swap', variable: '--font-display' })

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: SITE_TITLE, template: `%s · ${SITE_NAME}` },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: ['translated chat', 'multilingual messaging', 'chat translation', 'family chat across languages', 'video calls', 'group chat', 'afjini'],
  authors: [{ name: SITE_NAME, url: SITE_URL }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  category: 'communication',
  formatDetection: { telephone: false, email: false, address: false },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1, 'max-video-preview': -1 },
  },
  openGraph: { type: 'website', siteName: SITE_NAME, locale: 'en', url: '/', title: SITE_TITLE, description: SITE_DESCRIPTION },
  twitter: { card: 'summary_large_image', title: SITE_TITLE, description: SITE_DESCRIPTION },
  appleWebApp: { capable: true, title: SITE_NAME, statusBarStyle: 'black-translucent' },
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  interactiveWidget: 'resizes-content',
  colorScheme: 'dark light',
  themeColor: [
    { media: '(prefers-color-scheme: dark)', color: THEME_COLORS.dark },
    { media: '(prefers-color-scheme: light)', color: THEME_COLORS.light },
  ],
}

const clerkAppearance = {
  theme: shadcn,
  variables: {
    colorBackground: 'var(--surface)',
    colorForeground: 'var(--text)',
    colorNeutral: 'var(--text)',
    colorMuted: 'var(--surface-2)',
    colorMutedForeground: 'var(--text-muted)',
    colorPrimary: 'var(--accent)',
    colorPrimaryForeground: 'var(--on-accent)',
    colorInput: 'var(--input)',
    colorInputForeground: 'var(--text)',
    colorDanger: 'var(--danger)',
    colorRing: 'rgba(var(--accent-rgb), 0.5)',
    colorModalBackdrop: 'var(--backdrop)',
    fontFamily: 'var(--font-sans), sans-serif',
    borderRadius: '12px',
    fontWeight: { normal: 400, medium: 500, semibold: 600, bold: 700 },
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${sans.variable} ${display.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
      </head>
      <body className="antialiased">
        <ClerkProvider appearance={clerkAppearance}>
          <ConvexClientProvider>
            {children}
            <ServiceWorkerRegister />
            {process.env.NODE_ENV === 'production' && <Analytics />}
          </ConvexClientProvider>
        </ClerkProvider>
      </body>
    </html>
  )
}
