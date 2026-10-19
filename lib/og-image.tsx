import { ImageResponse } from 'next/og'

export const OG_SIZE = { width: 1200, height: 630 }
export const OG_CONTENT_TYPE = 'image/png'

type OgPage = { eyebrow: string; title: string; subtitle: string; alt: string }

export const OG_PAGES = {
  home: {
    eyebrow: 'Translated chat',
    title: 'Talk freely. Understand instantly.',
    subtitle: 'Chat, call and share with anyone, each in your own language.',
    alt: 'afjini: talk freely, understand instantly',
  },
  features: {
    eyebrow: 'Features',
    title: 'Tools that make room for people.',
    subtitle: 'Translated chats and groups, calls, pins, invite links and QR codes.',
    alt: 'afjini features: translated chats, groups, calls and more',
  },
  howItWorks: {
    eyebrow: 'How it works',
    title: 'Share a PIN. Start talking.',
    subtitle: 'Everyone reads your messages in their own language, automatically.',
    alt: 'How afjini works in three simple steps',
  },
  privacy: {
    eyebrow: 'Privacy',
    title: 'Private by design. Human by default.',
    subtitle: 'No public directory, no ads, and plain answers about your data.',
    alt: 'afjini privacy: private by design',
  },
  converter: {
    eyebrow: 'Language converter',
    title: 'Try afjini translation for free.',
    subtitle: 'Convert everyday phrases between languages and hear them read aloud.',
    alt: 'afjini language converter',
  },
  terms: {
    eyebrow: 'Terms & Conditions',
    title: 'The rules, written to be read.',
    subtitle: 'Your account, acceptable use, translation, calls and liability.',
    alt: 'afjini terms and conditions',
  },
} satisfies Record<string, OgPage>

const BUBBLES = [
  { text: 'Hello! See you soon?', align: 'flex-start' as const, mine: false },
  { text: '¡Hola! Nos vemos pronto.', align: 'flex-end' as const, mine: true },
  { text: 'Bonjour, à tout à l’heure !', align: 'flex-start' as const, mine: false },
]

/** A 1200×630 share card in afjini's colours. */
export function renderOgImage({ eyebrow, title, subtitle }: OgPage) {
  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          width: '100%',
          height: '100%',
          padding: '64px 72px',
          background: 'radial-gradient(circle at 88% 8%, rgba(226,184,92,0.28), rgba(226,184,92,0) 38%), linear-gradient(160deg, #061F28 0%, #0A2D34 55%, #061F28 100%)',
          color: '#F6ECD9',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', width: 680 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 64,
                height: 64,
                borderRadius: 18,
                background: 'linear-gradient(180deg, #F0C467, #C89536)',
                color: '#061F28',
                fontSize: 36,
                fontWeight: 700,
              }}
            >
              A
            </div>
            <div style={{ display: 'flex', fontSize: 36, fontWeight: 700, letterSpacing: -1 }}>afjini</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div style={{ display: 'flex', color: '#E2B85C', fontSize: 24, fontWeight: 700, letterSpacing: 3, textTransform: 'uppercase' }}>{eyebrow}</div>
            <div style={{ display: 'flex', fontSize: 66, fontWeight: 700, lineHeight: 1.06, letterSpacing: -2 }}>{title}</div>
            <div style={{ display: 'flex', color: '#D2CBBD', fontSize: 28, lineHeight: 1.35 }}>{subtitle}</div>
          </div>
        </div>
        <div style={{ display: 'flex', flex: 1, flexDirection: 'column', justifyContent: 'center', gap: 18, paddingLeft: 40 }}>
          {BUBBLES.map((bubble) => (
            <div key={bubble.text} style={{ display: 'flex', justifyContent: bubble.align }}>
              <div
                style={{
                  display: 'flex',
                  maxWidth: 330,
                  padding: '16px 20px',
                  borderRadius: bubble.mine ? '22px 6px 22px 22px' : '6px 22px 22px 22px',
                  background: bubble.mine ? 'linear-gradient(180deg, #F0C467, #C89536)' : '#123F43',
                  color: bubble.mine ? '#061F28' : '#F6ECD9',
                  fontSize: 24,
                  lineHeight: 1.3,
                }}
              >
                {bubble.text}
              </div>
            </div>
          ))}
        </div>
      </div>
    ),
    OG_SIZE,
  )
}
