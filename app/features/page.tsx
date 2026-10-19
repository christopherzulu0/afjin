import Link from 'next/link'
import { ArrowRight, Check, Globe2, LockKeyhole, MessageCircle, Phone, Pin, Smartphone, Users } from 'lucide-react'
import { SiteNav } from '@/components/site-nav'
import { JsonLd, breadcrumbs } from '@/components/json-ld'
import { SiteFooter } from '@/components/site-footer'
import { pageMetadata } from '@/lib/site'

const features = [
  {
    icon: MessageCircle,
    eyebrow: '01 / Conversations',
    title: 'A calmer place to chat',
    text: 'One-to-one chats and groups with photos, files and voice notes, all in one place that is easy on the eyes in light or dark.',
    bullets: ['Replies, reactions and read receipts', 'Edit or delete with a quick undo', 'Pin the messages that matter and forward the rest'],
    link: 'Start a chat',
  },
  {
    icon: Globe2,
    eyebrow: '02 / Understanding',
    title: 'Translation that stays present',
    text: 'Pick the language you read in. Messages from others arrive translated into it, and the original is always one tap away.',
    bullets: ['Translated automatically after each message is sent', 'View the original wording any time', 'Pause translation for any single chat'],
    link: 'Try translation in chat',
  },
  {
    icon: Users,
    eyebrow: '03 / Your people',
    title: 'Connect with a PIN or a link',
    text: 'Everyone gets a private afjini PIN like AFJ-7K2P, plus an invite link and QR code you can share. There is no public directory to browse.',
    bullets: ['Share a PIN, invite link or QR code', 'Groups with owners and admins', 'Group invite links you can reset or turn off'],
    link: 'Share your invite',
  },
  {
    icon: LockKeyhole,
    eyebrow: '04 / Peace of mind',
    title: 'Controls you can understand',
    text: 'Block someone, mute a busy chat, or archive a conversation without leaving it. Group admins can remove or ban members.',
    bullets: ['Block and unblock in one tap', 'Mute any chat, and choose push notifications per device', 'No public profiles or follower counts'],
    link: 'Open privacy controls in chat',
  },
]

const tools = [
  { icon: Phone, title: 'Voice and video calls', text: 'Move from messages to a call, one-to-one or with the whole group.' },
  { icon: Pin, title: 'Pins, forwards and previews', text: 'Keep key messages at the top, pass things along, and see what a link is before you open it.' },
  { icon: Smartphone, title: 'Install it like an app', text: 'Add afjini to your home screen, get notifications, and keep chatting on any device.' },
]

export const metadata = pageMetadata({
  title: 'Features',
  description: 'Translated one-to-one and group chats, voice and video calls, pinned messages, invite links and QR codes. Everything afjini does, in one place.',
  path: '/features',
})

export default function FeaturesPage() {
  return (
    <main className="subpage feature-page">
      <JsonLd data={breadcrumbs([{ name: 'Features', path: '/features' }])} />
      <SiteNav />
      <section className="subpage-hero feature-hero">
        <div className="section-kicker">The afjini experience</div>
        <h1>Tools that make<br /><em>room for people.</em></h1>
        <p>afjini is built for the conversations that matter: the daily check-in, the family story, the friend who lives far away, and every message that deserves to arrive clearly.</p>
        <div className="hero-pills">
          <span><Check /> Built for closeness</span>
          <span><Check /> Translated for you</span>
          <span><Check /> No public directory</span>
        </div>
      </section>
      <section className="feature-intro">
        <div>
          <div className="section-kicker">Everything in one place</div>
          <h2>A more generous way to stay connected.</h2>
        </div>
        <p>From the first hello to the last voice note of the night, afjini removes the friction between what you mean and what someone else understands.</p>
      </section>
      <section className="feature-detail-grid" aria-label="Main features">
        {features.map(({ icon: Icon, eyebrow, title, text, bullets, link }) => (
          <article className="feature-detail-card" key={title}>
            <div className="feature-detail-top">
              <div className="feature-icon"><Icon /></div>
              <span>{eyebrow}</span>
            </div>
            <h3>{title}</h3>
            <p>{text}</p>
            <ul>
              {bullets.map((bullet) => (
                <li key={bullet}><Check />{bullet}</li>
              ))}
            </ul>
            <Link href="/chat" className="feature-card-link">{link} <ArrowRight /></Link>
          </article>
        ))}
      </section>
      <section className="feature-image-band">
        <div className="feature-image-copy">
          <div className="section-kicker">Made for real life</div>
          <h2>Because the best conversations are not perfect.</h2>
          <p>They are half-finished thoughts, familiar jokes, long pauses, and the comfort of knowing someone is still there. afjini keeps all of that intact.</p>
          <div className="feature-quote">Write the way you speak. afjini handles the language, and the original is always there if you want it.</div>
        </div>
        <div className="how-conversation" role="img" aria-label="Example: messages written in English shown with Arabic translations">
          <div className="how-conversation-label" aria-hidden="true"><Globe2 /> English <span>→</span> Arabic <b>ON</b></div>
          <div className="demo-bubble" aria-hidden="true">I saved you a seat.<small>لقد حفظت لك مقعدًا.</small></div>
          <div className="demo-bubble demo-bubble-right" aria-hidden="true">On my way. I&apos;ll be there soon.<small>في الطريق. سأصل قريبًا.</small></div>
          <div className="demo-bubble" aria-hidden="true">The best conversations are not perfect.<small>أفضل المحادثات ليست مثالية.</small></div>
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
          <div className="frame-meta"><span>Family</span><span>Friends</span><span>Invite only</span></div>
        </div>
        <div>
          <div className="section-kicker">For the people you love</div>
          <h2>Closer should feel simple.</h2>
          <p>Start a group for the people who matter. Everyone reads in their own language, and afjini takes care of the distance.</p>
          <Link href="/chat" className="primary-cta">Create a group <ArrowRight /></Link>
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
