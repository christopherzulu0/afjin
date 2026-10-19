import type { Metadata } from 'next'
import Link from 'next/link'
import { LegalPage, type LegalSection } from '@/components/legal-page'
import { LEGAL } from '@/lib/legal'
import { pageMetadata } from '@/lib/site'

export const metadata: Metadata = pageMetadata({
  title: 'Terms & Conditions',
  description: 'The rules for using afjini: your account and PIN, acceptable use, your content, machine translation, calls, and limits of liability.',
  path: '/terms',
})

const mail = <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a>

const sections: LegalSection[] = [
  {
    id: 'agreement',
    title: 'Agreement',
    body: (
      <p>
        These Terms are an agreement between you and {LEGAL.company} (&ldquo;we&rdquo;, &ldquo;us&rdquo;) for your use of afjini, including the website, the chat app and the installable app. By creating an account or using afjini you agree to these Terms and to our <Link href="/privacy/policy">Privacy Policy</Link>. If you don&apos;t agree, please don&apos;t use afjini.
      </p>
    ),
  },
  {
    id: 'eligibility',
    title: 'Who can use afjini',
    body: (
      <p>
        You must be at least {LEGAL.minAge} years old, or the minimum age required in your country if that is higher, and able to agree to these Terms. If you use afjini for an organisation, you confirm you are allowed to accept these Terms for it.
      </p>
    ),
  },
  {
    id: 'account',
    title: 'Your account, PIN and invite links',
    body: (
      <ul>
        <li>You are responsible for your account and for keeping your sign-in details secure.</li>
        <li>Your afjini PIN, invite link and QR code let people start a chat with you. Share them only with people you want to hear from. You can reset your invite link at any time.</li>
        <li>Group owners and admins are responsible for who they invite, and can remove or ban members.</li>
        <li>Tell us at {mail} if you think someone else is using your account.</li>
      </ul>
    ),
  },
  {
    id: 'acceptable-use',
    title: 'Acceptable use',
    body: (
      <>
        <p>Use afjini respectfully and lawfully. You must not:</p>
        <ul>
          <li>Harass, threaten, bully or impersonate anyone, or share hateful content.</li>
          <li>Send spam, bulk or automated messages, or try to guess other people&apos;s PINs or invite links.</li>
          <li>Share content that is illegal, sexually exploits anyone, or infringes someone else&apos;s rights.</li>
          <li>Send malware, or try to break, overload, reverse-engineer or get around the security or limits of afjini.</li>
          <li>Record or share other people&apos;s calls or messages without the consent the law requires.</li>
        </ul>
      </>
    ),
  },
  {
    id: 'your-content',
    title: 'Your content',
    body: (
      <>
        <p>
          You keep ownership of the messages, files and other content you send. You give us a limited, worldwide licence to store, copy, translate, display and transmit your content only as needed to run afjini for you and the people you talk to, for example to translate a message or deliver it to a group.
        </p>
        <p>You confirm you have the right to share the content you send. People you send content to can see it, forward it and keep copies, so think before you share.</p>
      </>
    ),
  },
  {
    id: 'translation',
    title: 'Machine translation',
    body: (
      <p>
        Translations are produced automatically by a machine-translation provider and may be incomplete or wrong, or may miss tone and nuance. The original message is always available. Don&apos;t rely on translations for medical, legal, financial, safety or other critical decisions.
      </p>
    ),
  },
  {
    id: 'calls',
    title: 'Calls and notifications',
    body: (
      <p>
        Voice and video calls depend on your connection, device and browser permissions, and may drop or have poor quality. afjini is not a replacement for a phone service and <strong>cannot be used to contact emergency services</strong>. Notifications are delivered by your browser&apos;s push service and may be delayed or missed.
      </p>
    ),
  },
  {
    id: 'third-parties',
    title: 'Third-party services and links',
    body: (
      <p>
        afjini relies on third-party services, such as sign-in, hosting, translation and calling providers, described in the <Link href="/privacy/policy#processors">Privacy Policy</Link>. Links and link previews in messages point to websites we don&apos;t control and aren&apos;t responsible for.
      </p>
    ),
  },
  {
    id: 'enforcement',
    title: 'Blocking, suspension and ending your account',
    body: (
      <ul>
        <li>You can block anyone, and leave or archive any chat, at any time.</li>
        <li>We may remove content, or limit, suspend or close accounts, that break these Terms or put others at risk. Where reasonable we will tell you why.</li>
        <li>You can stop using afjini and ask us to delete your account at any time by emailing {mail}.</li>
      </ul>
    ),
  },
  {
    id: 'availability',
    title: 'Changes to afjini',
    body: <p>We are always improving afjini and may add, change or remove features. We try to keep the service running, but it may sometimes be unavailable for maintenance or reasons outside our control.</p>,
  },
  {
    id: 'disclaimers',
    title: 'Disclaimers',
    body: (
      <p>
        afjini is provided &ldquo;as is&rdquo; and &ldquo;as available&rdquo;. To the extent the law allows, we make no promises that it will be uninterrupted, error-free or fit for a particular purpose, or that translations will be accurate. Nothing in these Terms limits rights you have under consumer law that cannot be excluded.
      </p>
    ),
  },
  {
    id: 'liability',
    title: 'Limitation of liability',
    body: (
      <p>
        To the extent the law allows, we are not liable for indirect, incidental or consequential losses, or for loss of data, profits or goodwill, arising from your use of afjini. Our total liability for any claim relating to afjini is limited to the greater of the amount you paid us in the 12 months before the claim or 50 EUR. We do not limit liability for death or personal injury caused by negligence, fraud, or anything else that cannot be limited by law.
      </p>
    ),
  },
  {
    id: 'law',
    title: 'Governing law',
    body: <p>These Terms are governed by the laws of {LEGAL.country}, and disputes will be handled by its courts, unless the consumer law of the country where you live gives you the right to bring a claim there.</p>,
  },
  {
    id: 'changes',
    title: 'Changes to these Terms',
    body: <p>We may update these Terms. If a change is significant, we will update the date at the top of this page and tell you in the app before it takes effect. If you keep using afjini after that, the new Terms apply.</p>,
  },
  {
    id: 'contact',
    title: 'Contact',
    body: <p>Questions about these Terms: {mail}, {LEGAL.company}, {LEGAL.country}.</p>,
  },
]

export default function TermsPage() {
  return (
    <LegalPage
      kicker="Terms & Conditions"
      title="Terms & Conditions"
      intro="The rules for using afjini, written to be read. Please read them together with our Privacy Policy."
      sections={sections}
      related={{ href: '/privacy/policy', label: 'Privacy Policy' }}
    />
  )
}
