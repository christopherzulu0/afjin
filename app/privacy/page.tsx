import Link from 'next/link'
import { ArrowRight, Bell, Check, EyeOff, LockKeyhole, ShieldCheck, UserRound, Users } from 'lucide-react'
import { SiteNav } from '@/components/site-nav'
import { SiteFooter } from '@/components/site-footer'

const promises = [
  { icon: LockKeyhole, title: 'Private connections', text: 'Connect with people you know through private invitations and JINN PINs. No public directory and no pressure to be discoverable.' },
  { icon: Bell, title: 'Controls that stay close', text: 'Mute, block, report, and manage notifications without leaving your conversation or hunting through settings.' },
  { icon: EyeOff, title: 'Less data, less noise', text: 'We keep the experience focused on conversations, not public profiles, engagement loops, or noisy recommendations.' },
]

const controls = [
  'Choose who can reach you',
  'Mute a conversation without leaving it',
  'See and manage active sessions',
  'Keep originals available alongside translations',
]

export const metadata = { title: 'Privacy · afjini', description: 'Learn how afjini keeps conversations private and human.' }

export default function PrivacyPage() {
  return (
    <main className="subpage privacy-page">
      <SiteNav />
      <section className="subpage-hero privacy-hero">
        <div className="section-kicker"><ShieldCheck /> Your conversation, your say</div>
        <h1>Private by design.<br /><em>Human by default.</em></h1>
        <p>afjini is built to help you feel safe enough to say what you mean. The controls are simple because your attention belongs in the conversation.</p>
        <div className="privacy-badge">
          <span><ShieldCheck /></span>
          <div>
            <strong>Your space, your rules</strong>
            <small>Simple controls. Clear choices.</small>
          </div>
        </div>
      </section>
      <section className="privacy-grid privacy-promises">
        {promises.map(({ icon: Icon, title, text }) => (
          <article className="privacy-card" key={title}>
            <div className="feature-icon"><Icon /></div>
            <h2>{title}</h2>
            <p>{text}</p>
            <Link href="/chat">See the control <ArrowRight /></Link>
          </article>
        ))}
      </section>
      <section className="privacy-split">
        <div className="privacy-visual">
          <div className="privacy-visual-top"><span /><span /><span /><b>afjini / privacy</b></div>
          <div className="privacy-visual-body">
            <div className="privacy-shield"><ShieldCheck /></div>
            <strong>Conversation protected</strong>
            <span>Only the people you invite can find this space.</span>
            <div className="privacy-person">
              <span className="mini-avatar">JS</span>
              <div><b>Jordan&apos;s circle</b><small>3 members · invite only</small></div>
              <LockKeyhole />
            </div>
            <div className="privacy-person">
              <span className="mini-avatar coral">MR</span>
              <div><b>Maya Rodriguez</b><small>Can message you</small></div>
              <Check />
            </div>
          </div>
        </div>
        <div className="privacy-split-copy">
          <div className="section-kicker">Good boundaries, better conversations</div>
          <h2>Privacy should feel like a quiet exhale.</h2>
          <p>Use afjini on your terms. Choose who can reach you, how you are notified, and when a conversation needs a little quiet.</p>
          <div className="check-list">
            {controls.map((control) => (
              <span key={control}><Check /> {control}</span>
            ))}
          </div>
        </div>
      </section>
      <section className="privacy-principles">
        <div>
          <div className="section-kicker">Our principles</div>
          <h2>Clarity is a feature.</h2>
        </div>
        <div className="principle-list">
          <article>
            <UserRound />
            <div>
              <strong>People over metrics</strong>
              <p>Your relationships are the product, not your attention.</p>
            </div>
          </article>
          <article>
            <Users />
            <div>
              <strong>Intentional by default</strong>
              <p>Private spaces make room for more honest conversations.</p>
            </div>
          </article>
        </div>
      </section>
      <section className="final-cta">
        <div>
          <div className="section-kicker">Feel at home</div>
          <h2>Connection with room to breathe.</h2>
          <p>Start a conversation that respects your time, language, and boundaries.</p>
        </div>
        <Link href="/chat" className="primary-cta">Open afjini <ArrowRight /></Link>
      </section>
      <SiteFooter ctaHref="/" ctaLabel="Back to home" />
    </main>
  )
}
