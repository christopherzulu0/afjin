import Link from 'next/link'
import { ArrowRight, Check, Globe2, LockKeyhole, MessageCircle, Mic2, Sparkles, Users, Video } from 'lucide-react'
import { SiteNav } from '@/components/site-nav'
import { SiteFooter } from '@/components/site-footer'

const features = [
  { icon: MessageCircle, eyebrow: '01 / Conversations', title: 'A calmer place to chat', text: 'Keep one-to-one conversations, group threads, photos, files, and voice notes together in a workspace designed to feel human.', bullets: ['Clear, threaded conversations', 'Photos, files, and voice notes', 'Read receipts that respect your rhythm'] },
  { icon: Globe2, eyebrow: '02 / Understanding', title: 'Translation that stays present', text: 'Choose the languages for each conversation and read the original beside the translation whenever you want more context.', bullets: ['Automatic translation as you type', 'Original text always one tap away', 'Language preferences per conversation'] },
  { icon: Users, eyebrow: '03 / Your people', title: 'Connection by invitation', text: 'Use a private JINN PIN to find your people. No public directory, no noisy recommendations, and no awkward setup.', bullets: ['Private invite-only discovery', 'Groups for family and friends', 'Simple controls for every space'] },
  { icon: LockKeyhole, eyebrow: '04 / Peace of mind', title: 'Privacy you can understand', text: 'Mute, block, report, and manage notifications from the conversation itself. Your messages belong to you.', bullets: ['Privacy controls in plain language', 'Notification settings per chat', 'No public social graph'] },
]

const tools = [
  { icon: Mic2, title: 'Voice notes', text: 'Say it naturally. Let afjini carry the meaning across.' },
  { icon: Video, title: 'Face-to-face', text: 'Move from messages to a call when the moment deserves it.' },
  { icon: Sparkles, title: 'Thoughtful details', text: 'Small signals make every exchange feel considered.' },
]

export const metadata = { title: 'Features · afjini', description: 'Explore the thoughtful features behind afjini.' }

export default function FeaturesPage() {
  return (
    <main className="subpage feature-page">
      <SiteNav />
      <section className="subpage-hero feature-hero">
        <div className="section-kicker">The afjini experience</div>
        <h1>Tools that make<br /><em>room for people.</em></h1>
        <p>afjini is built for the conversations that matter: the daily check-in, the family story, the friend who lives far away, and every feeling that deserves to arrive clearly.</p>
        <div className="hero-pills">
          <span><Check /> Built for closeness</span>
          <span><Check /> Designed for clarity</span>
          <span><Check /> Private by default</span>
        </div>
      </section>
      <section className="feature-intro">
        <div>
          <div className="section-kicker">Everything in one place</div>
          <h2>A more generous way to stay connected.</h2>
        </div>
        <p>From the first hello to the last voice note of the night, afjini removes the friction between what you mean and what someone else hears.</p>
      </section>
      <section className="feature-detail-grid">
        {features.map(({ icon: Icon, eyebrow, title, text, bullets }) => (
          <article className="feature-detail-card" key={title}>
            <div className="feature-detail-top">
              <div className="feature-icon"><Icon /></div>
              <span>{eyebrow}</span>
            </div>
            <h2>{title}</h2>
            <p>{text}</p>
            <ul>
              {bullets.map((bullet) => (
                <li key={bullet}><Check />{bullet}</li>
              ))}
            </ul>
            <Link href="/chat" className="feature-card-link">Try it in chat <ArrowRight /></Link>
          </article>
        ))}
      </section>
      <section className="feature-image-band">
        <div className="feature-image-copy">
          <div className="section-kicker">Made for real life</div>
          <h2>Because the best conversations are not perfect.</h2>
          <p>They are half-finished thoughts, familiar jokes, long pauses, and the comfort of knowing someone is still there. afjini keeps all of that intact.</p>
          <div className="feature-quote">“I can finally speak naturally with my family.”<small>— Mina, early afjini member</small></div>
        </div>
        <div className="how-conversation" aria-label="A translated family message">
          <div className="how-conversation-label"><Globe2 /> English <span>→</span> Arabic <b>ON</b></div>
          <div className="demo-bubble">I saved you a seat.<small>لقد حفظت لك مقعدًا.</small></div>
          <div className="demo-bubble demo-bubble-right">On my way. I&apos;ll be there soon.<small>في الطريق. سأصل قريبًا.</small></div>
          <div className="demo-bubble">The best conversations are not perfect.<small>أفضل المحادثات ليست مثالية.</small></div>
        </div>
      </section>
      <section className="tool-section">
        <div className="section-kicker">More ways to connect</div>
        <h2>Bring your whole voice.</h2>
        <div className="tool-grid">
          {tools.map(({ icon: Icon, title, text }) => (
            <article key={title}>
              <div className="tool-icon"><Icon /></div>
              <h3>{title}</h3>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </section>
      <section className="family-section feature-family">
        <div className="framed-panel">
          <div className="section-kicker">Your circle</div>
          <p className="framed-quote">Closer should feel like a room you already know.</p>
          <div className="frame-meta"><span>Family</span><span>Friends</span><span>Private by default</span></div>
        </div>
        <div>
          <div className="section-kicker">For the people you love</div>
          <h2>Closer should feel simple.</h2>
          <p>Start a private space for the people who matter, choose the languages you use, and let afjini take care of the distance.</p>
          <Link href="/chat" className="primary-cta">Start a conversation <ArrowRight /></Link>
        </div>
      </section>
      <section className="final-cta">
        <div>
          <div className="section-kicker">Your next conversation</div>
          <h2>Say what you mean.</h2>
          <p>Open afjini and make a little more room for each other.</p>
        </div>
        <Link href="/chat" className="primary-cta">Open chat <ArrowRight /></Link>
      </section>
      <SiteFooter ctaHref="/" ctaLabel="Back to home" />
    </main>
  )
}
