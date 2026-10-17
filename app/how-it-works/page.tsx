import Link from 'next/link'
import { ArrowRight, Check, Globe2, LockKeyhole, MessageCircle, Sparkles, Users } from 'lucide-react'
import { SiteNav } from '@/components/site-nav'
import { SiteFooter } from '@/components/site-footer'

const steps = [
  { number: '01', icon: Users, title: 'Create your circle', text: 'Set up your profile, choose the languages you use, and decide who gets a place in your afjini space.' },
  { number: '02', icon: LockKeyhole, title: 'Connect privately', text: 'Share a JINN PIN or send an invite directly. Your people arrive intentionally, without a public directory.' },
  { number: '03', icon: MessageCircle, title: 'Start naturally', text: 'Send a message, photo, file, or voice note. afjini keeps the conversation moving while taking care of the distance.' },
]

const details = [
  'Original text is always one tap away',
  'Language preferences can change per conversation',
  'Every message keeps its context and tone',
  'Privacy controls stay close to the conversation',
]

export const metadata = { title: 'How it works · afjini', description: 'Learn how afjini makes multilingual conversations feel natural.' }

export default function HowItWorksPage() {
  return (
    <main className="subpage how-page">
      <SiteNav />
      <section className="subpage-hero how-hero">
        <div className="section-kicker"><Sparkles /> Simple from the first hello</div>
        <h1>Connection, without<br /><em>the complexity.</em></h1>
        <p>Bring your people together in a space that feels familiar from the start. afjini handles the distance and leaves you with the conversation.</p>
        <div className="how-hero-meta">
          <span><b>3</b> thoughtful steps</span>
          <span><b>1</b> calm space</span>
          <span><b>∞</b> ways to connect</span>
        </div>
      </section>
      <section className="process-grid process-detailed">
        {steps.map(({ number, icon: Icon, title, text }) => (
          <article className="process-card" key={number}>
            <div className="process-icon"><Icon /></div>
            <span className="step-number">{number}</span>
            <div className="step-line" />
            <h2>{title}</h2>
            <p>{text}</p>
            <Link href="/chat">See it in action <ArrowRight /></Link>
          </article>
        ))}
      </section>
      <section className="how-story">
        <div className="how-story-copy">
          <div className="section-kicker">Translation in context</div>
          <h2>Your words, their language.</h2>
          <p>Language settings belong to each conversation, so a family group, a friendship, and a team can all communicate in the way that works for them.</p>
          <div className="check-list">
            {details.map((detail) => (
              <span key={detail}><Check /> {detail}</span>
            ))}
          </div>
          <Link href="/features" className="text-cta">Explore the features <ArrowRight /></Link>
        </div>
        <div className="how-conversation">
          <div className="how-conversation-label"><Globe2 /> English <span>→</span> Spanish <b>ON</b></div>
          <div className="demo-bubble">I saved you a seat.<small>Te guardé un asiento.</small></div>
          <div className="demo-bubble demo-bubble-right">On my way. I&apos;ll be there soon.<small>En camino. Llegaré pronto.</small></div>
          <div className="demo-bubble">Perfect. See you soon!<small>¡Perfecto, nos vemos pronto!</small></div>
        </div>
      </section>
      <section className="how-reassurance">
        <div>
          <div className="section-kicker">Designed to disappear</div>
          <h2>The technology should feel invisible. The closeness should not.</h2>
        </div>
        <p>That is why afjini keeps translations readable, controls understandable, and the original message nearby. More clarity, less friction.</p>
      </section>
      <section className="final-cta">
        <div>
          <div className="section-kicker">Ready when you are</div>
          <h2>Make room for the next hello.</h2>
          <p>Open a calm, private space for the people in your life.</p>
        </div>
        <Link href="/chat" className="primary-cta">Start chatting <ArrowRight /></Link>
      </section>
      <SiteFooter ctaHref="/features" ctaLabel="Explore features" />
    </main>
  )
}
