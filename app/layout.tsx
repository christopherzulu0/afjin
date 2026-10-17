import { ClerkProvider } from '@clerk/nextjs'
import { shadcn } from '@clerk/ui/themes'
import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { ConvexClientProvider } from '@/components/convex-client-provider'
import './globals.css'

export const metadata: Metadata = {
  title: 'afjini — Talk freely. Understand instantly.',
  description: 'afjini brings thoughtful chat and automatic translation together for more meaningful conversations.',
  generator: 'v0.app',
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
  colorScheme: 'dark',
  themeColor: '#061f28',
}

const clerkAppearance = {
  theme: shadcn,
  variables: {
    colorBackground: '#0a2d34',
    colorForeground: '#f6ecd9',
    colorNeutral: '#f6ecd9',
    colorMuted: '#123f43',
    colorMutedForeground: '#b7aea0',
    colorPrimary: '#e2b85c',
    colorPrimaryForeground: '#061f28',
    colorInput: '#0c333a',
    colorInputForeground: '#f6ecd9',
    colorDanger: '#e7a28e',
    colorRing: 'rgba(226, 184, 92, 0.5)',
    colorModalBackdrop: 'rgba(2, 12, 16, 0.65)',
    fontFamily: "'DM Sans', sans-serif",
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
    <html lang="en">
      <body className="antialiased">
        <ClerkProvider appearance={clerkAppearance}>
          <ConvexClientProvider>
            {children}
            {process.env.NODE_ENV === 'production' && <Analytics />}
          </ConvexClientProvider>
        </ClerkProvider>
      </body>
    </html>
  )
}