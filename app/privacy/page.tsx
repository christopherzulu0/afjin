import Link from 'next/link'
import { ArrowRight, Ban, BellOff, Check, EyeOff, FileText, Globe2, LockKeyhole, ShieldCheck, UserRound } from 'lucide-react'
import { SiteNav } from '@/components/site-nav'
import { SiteFooter } from '@/components/site-footer'
import { pageMetadata } from '@/lib/site'

const promises = [
  { icon: LockKeyhole, title: 'No public directory', text: 'People reach you with your afjini PIN, invite link or QR code. There is no searchable list of users and no profile for strangers to browse.', link: 'Share your invite privately', href: '/chat' },
  { icon: Ban, title: 'Block and mute anytime', text: 'Block someone and neither of you can message or call the other. Mute a busy chat, or archive it, without leaving the conversation.', link: 'Open privacy controls in chat', href: '/chat' },
  { icon: EyeOff, title: 'Less data, less noise', text: 'No follower counts, no feeds, no ads. afjini keeps what it needs to deliver your conversations, and nothing it uses to sell your attention.', link: 'Read what we store', href: '/privacy/policy#what-we-collect' },
]

const controls = [
  'Block or unblock someone from the chat header',
  'Mute notifications for any single chat',
  'Turn push notifications on or off for each device',
  'Reset your invite link if it was shared too widely',
]

export const metadata = pageMetadata({
  title: 'Privacy',
  description: 'No public directory, no ads, and plain answers: how afjini handles your messages, translation with DeepL, blocking, muting and deleting.',
  path: '/privacy',
})

export default function PrivacyPage() {
  return (
    <main className="subpage privacy-page">
      <SiteNav />
      <section className="subpage-hero privacy-hero">
        <div className="section-kicker"><ShieldCheck /> Your conversation, your say</div>
        <h1>Private by design.<br /><em>Human by default.</em></h1>
        <p>afjini is built to help you feel safe enough to say what you mean. The controls are simple, and this page explains plainly what happens to your messages.</p>
        <div className="privacy-badge">
          <span><ShieldCheck /></span>
          <div>
            <strong>Your space, your rules</strong>
            <small>Simple controls. Clear choices.</small>
          </div>
        </div>
      </section>
      <section className="privacy-grid privacy-promises" aria-labelledby="privacy-promises-title">
        <h2 id="privacy-promises-title" className="sr-only">What we promise</h2>
        {promises.map(({ icon: Icon, title, text, link, href }) => (
          <article className="privacy-card" key={title}>
            <div className="feature-icon"><Icon /></div>
            <h3>{title}</h3>
            <p>{text}</p>
            <Link href={href}>{link} <ArrowRight /></Link>
          </article>
        ))}
      </section>
      <section className="privacy-split">
        <div className="privacy-visual" role="img" aria-label="Example: a group chat that only invited members can join">
          <div className="privacy-visual-top" aria-hidden="true"><span /><span /><span /><b>afjini / privacy</b></div>
          <div className="privacy-visual-body" aria-hidden="true">
            <div className="privacy-shield"><ShieldCheck /></div>
            <strong>Invite-only group</strong>
            <span>People join with the group&apos;s invite link, which admins can reset or turn off.</span>
            <div className="privacy-person">
              <span className="mini-avatar">JS</span>
              <div><b>Jordan&apos;s circle</b><small>3 members · invite link on</small></div>
              <LockKeyhole />
            </div>
            <div className="privacy-person">
              <span className="mini-avatar coral">MR</span>
              <div><b>Maya Rodriguez</b><small>Muted</small></div>
              <BellOff />
            </div>
          </div>
        </div>
        <div className="privacy-split-copy">
          <div className="section-kicker">Good boundaries, better conversations</div>
          <h2>Privacy should feel like a quiet exhale.</h2>
          <p>Anyone who has your PIN or invite link can message you. If someone shouldn&apos;t, block them, and reset your link so it stops working.</p>
          <div className="check-list">
            {controls.map((control) => (
              <span key={control}><Check /> {control}</span>
            ))}
          </div>
        </div>
      </section>
      <section className="privacy-principles">
        <div>
          <div className="section-kicker">Straight answers</div>
          <h2>Clarity is a feature.</h2>
        </div>
        <div className="principle-list">
          <article>
            <Globe2 />
            <div>
              <h3>Translation uses DeepL</h3>
              <p>When someone in a chat reads in a different language, the message text is sent to DeepL to translate it. Attachments and voice notes are never sent.</p>
            </div>
          </article>
          <article>
            <LockKeyhole />
            <div>
              <h3>Encrypted in transit, not end-to-end</h3>
              <p>Messages travel over encrypted connections and are stored by our database provider. They are not end-to-end encrypted, which is what makes server-side translation possible.</p>
            </div>
          </article>
          <article>
            <UserRound />
            <div>
              <h3>Deleting really deletes</h3>
              <p>A deleted message, and any files attached to it, are removed for good once the short undo window has passed.</p>
            </div>
          </article>
        </div>
      </section>
      <section className="final-cta">
        <div>
          <div className="section-kicker"><FileText /> The details</div>
          <h2>Read the full privacy policy.</h2>
          <p>Exactly what we collect, which services process it, how long we keep it, and how to ask us to delete it.</p>
        </div>
        <Link href="/privacy/policy" className="primary-cta">Privacy policy <ArrowRight /></Link>
      </section>
      <SiteFooter ctaHref="/" ctaLabel="Back to home" />
    </main>
  )
}
