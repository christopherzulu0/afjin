import Link from 'next/link'
import { ArrowRight, Check, Globe2, LockKeyhole, MessageCircle, Sparkles, Users } from 'lucide-react'
import { SiteNav } from '@/components/site-nav'
import { JsonLd, breadcrumbs } from '@/components/json-ld'
import { SiteFooter } from '@/components/site-footer'
import { absoluteUrl, pageMetadata } from '@/lib/site'

const steps = [
  { number: '01', icon: Users, title: 'Create your account', text: 'Sign in, pick the language you read in, and get your own afjini PIN, like AFJ-7K2P.', link: 'Create your account' },
  { number: '02', icon: LockKeyhole, title: 'Connect with your people', text: 'Share your PIN, invite link or QR code. Only people who have one of them can start a chat with you.', link: 'Share your invite link' },
  { number: '03', icon: MessageCircle, title: 'Start talking', text: 'Send a message, photo, file or voice note, or start a call. Everyone reads your messages in their own language.', link: 'Send your first message' },
]

const details = [
  'The original message is always one tap away',
  'Change the language you read in at any time',
  'Pause translation for a single chat',
  'Block, mute and archive from inside the conversation',
]

export const metadata = pageMetadata({
  title: 'How it works',
  description: 'Create an account, share your afjini PIN or invite link, and start talking. Everyone reads your messages in their own language, translated automatically.',
  path: '/how-it-works',
})

export default function HowItWorksPage() {
  return (
    <main className="subpage how-page">
      <JsonLd data={breadcrumbs([{ name: 'How it works', path: '/how-it-works' }])} />
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'HowTo',
          name: 'How to start a translated conversation on afjini',
          description: 'Create an account, share your afjini PIN or invite link, and start talking in your own language.',
          totalTime: 'PT2M',
          step: steps.map((step, index) => ({ '@type': 'HowToStep', position: index + 1, name: step.title, text: step.text, url: absoluteUrl('/chat') })),
        }}
      />
      <SiteNav />
      <section className="subpage-hero how-hero">
        <div className="section-kicker"><Sparkles /> Simple from the first hello</div>
        <h1>Connection, without<br /><em>the complexity.</em></h1>
        <p>Bring your people together in a space that feels familiar from the start. afjini handles the distance and leaves you with the conversation.</p>
        <div className="how-hero-meta">
          <span><b>3</b> simple steps</span>
          <span><b>1</b> reading language each</span>
          <span><b aria-hidden="true">∞</b><span className="sr-only">Unlimited</span> ways to connect</span>
        </div>
      </section>
      <section className="process-grid process-detailed" aria-label="Getting started">
        {steps.map(({ number, icon: Icon, title, text, link }) => (
          <article className="process-card" key={number}>
            <div className="process-icon"><Icon /></div>
            <span className="step-number" aria-hidden="true">{number}</span>
            <div className="step-line" aria-hidden="true" />
            <h2>{title}</h2>
            <p>{text}</p>
            <Link href="/chat">{link} <ArrowRight /></Link>
          </article>
        ))}
      </section>
      <section className="how-story">
        <div className="how-story-copy">
          <div className="section-kicker">Translation in context</div>
          <h2>Your words, their language.</h2>
          <p>Everyone chooses the one language they read in. When you send a message, afjini translates it for each person in the chat, so a family group with three languages just works.</p>
          <div className="check-list">
            {details.map((detail) => (
              <span key={detail}><Check /> {detail}</span>
            ))}
          </div>
          <Link href="/features" className="text-cta">Explore the features <ArrowRight /></Link>
        </div>
        <div className="how-conversation" role="img" aria-label="Example: messages written in English shown with Spanish translations">
          <div className="how-conversation-label" aria-hidden="true"><Globe2 /> English <span>→</span> Spanish <b>ON</b></div>
          <div className="demo-bubble" aria-hidden="true">I saved you a seat.<small>Te guardé un asiento.</small></div>
          <div className="demo-bubble demo-bubble-right" aria-hidden="true">On my way. I&apos;ll be there soon.<small>En camino. Llegaré pronto.</small></div>
          <div className="demo-bubble" aria-hidden="true">Perfect. See you soon!<small>¡Perfecto, nos vemos pronto!</small></div>
        </div>
      </section>
      <section className="how-reassurance">
        <div>
          <div className="section-kicker">Designed to disappear</div>
          <h2>The technology should feel invisible. The closeness should not.</h2>
        </div>
        <p>That is why afjini keeps translations readable, controls understandable, and the original message nearby. Machine translation is very good, but not perfect, so the original is never more than a tap away.</p>
      </section>
      <section className="final-cta">
        <div>
          <div className="section-kicker">Ready when you are</div>
          <h2>Make room for the next hello.</h2>
          <p>Open a calm space for the people in your life.</p>
        </div>
        <Link href="/chat" className="primary-cta">Start chatting <ArrowRight /></Link>
      </section>
      <SiteFooter ctaHref="/features" ctaLabel="Explore features" />
    </main>
  )
}
