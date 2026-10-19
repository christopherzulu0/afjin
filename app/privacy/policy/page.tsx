import type { Metadata } from 'next'
import Link from 'next/link'
import { LegalPage, type LegalSection } from '@/components/legal-page'
import { LEGAL } from '@/lib/legal'
import { pageMetadata } from '@/lib/site'

export const metadata: Metadata = pageMetadata({
  title: 'Privacy Policy',
  description: 'What afjini collects, why we need it, which services process it, how long we keep it, and how to access or delete your data.',
  path: '/privacy/policy',
})

const mail = <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a>

const sections: LegalSection[] = [
  {
    id: 'who-we-are',
    title: 'Who we are',
    body: (
      <p>
        afjini is operated by {LEGAL.company}, based in {LEGAL.country} (&ldquo;we&rdquo;, &ldquo;us&rdquo;). We are responsible for the personal data described in this policy. You can reach us about privacy at any time at {mail}.
      </p>
    ),
  },
  {
    id: 'what-we-collect',
    title: 'What we collect',
    body: (
      <>
        <p>We only collect what afjini needs to run your conversations:</p>
        <ul>
          <li><strong>Account details:</strong> your name, email address and profile picture, which come from your sign-in account.</li>
          <li><strong>Profile settings:</strong> your afjini PIN, the language you read in, your invite link code, and your theme and sound preferences (the last two are stored only in your browser).</li>
          <li><strong>Messages and content:</strong> the text you send, photos, files and voice notes you attach, replies, reactions, edits, pinned and forwarded messages, and link previews generated for links you send.</li>
          <li><strong>Translations:</strong> the translated versions of messages, saved so they don&apos;t have to be translated again.</li>
          <li><strong>Conversations and groups:</strong> who is in each chat, group names, roles (owner, admin, member), bans, blocks, mute and archive settings, and read status.</li>
          <li><strong>Calls:</strong> who called whom, when, whether the call was answered, and how long it lasted. We do not record call audio or video.</li>
          <li><strong>Presence:</strong> whether you are online, viewing a chat, or typing. This is kept only briefly to show live status.</li>
          <li><strong>Notifications:</strong> if you turn on push notifications, the push address your browser gives us for that device.</li>
          <li><strong>Usage:</strong> anonymous page-view statistics on our website, and technical logs needed to keep the service secure and working.</li>
        </ul>
      </>
    ),
  },
  {
    id: 'how-we-use',
    title: 'How we use it',
    body: (
      <ul>
        <li>To deliver your messages, files and calls to the people you choose.</li>
        <li>To translate messages into each reader&apos;s language.</li>
        <li>To show read receipts, presence, typing indicators and notifications.</li>
        <li>To keep afjini safe: enforcing blocks and bans, limiting spam, and investigating abuse reported to us.</li>
        <li>To fix problems and improve the service.</li>
      </ul>
    ),
  },
  {
    id: 'legal-bases',
    title: 'Legal bases',
    body: (
      <p>
        Where data-protection law requires a legal basis, we rely on performing our contract with you (running afjini as described in the <Link href="/terms">Terms</Link>), our legitimate interest in keeping the service secure and improving it, and your consent where we ask for it, such as for push notifications. You can withdraw consent at any time.
      </p>
    ),
  },
  {
    id: 'processors',
    title: 'Services that process your data',
    body: (
      <>
        <p>We use trusted providers to run afjini. They process data on our behalf and only for the purposes below:</p>
        <ul>
          <li><strong>Clerk:</strong> sign-in and account management.</li>
          <li><strong>Convex:</strong> our database, file storage and server functions. Your messages, files and settings are stored here.</li>
          <li><strong>DeepL:</strong> machine translation. The text of a message is sent to DeepL whenever someone in the chat reads in a different language from the one it was written in. Pausing translation in a chat only hides translations for you. Attachments and voice notes are not sent.</li>
          <li><strong>LiveKit:</strong> voice and video calls. Call audio and video pass through LiveKit&apos;s servers to reach the other people in the call and are not recorded.</li>
          <li><strong>Browser push services</strong> (for example Google, Apple or Mozilla): deliver notifications to devices where you turned them on.</li>
          <li><strong>Vercel:</strong> hosting and anonymous website analytics.</li>
        </ul>
        <p>
          <strong>Link previews:</strong> when you send a link, our server visits that page to fetch its title, description and image. The website sees our server, not you. People who see the preview load its image directly from that website, so the website may see their IP address. You can remove a preview from your own messages.
        </p>
      </>
    ),
  },
  {
    id: 'sharing',
    title: 'Who can see what',
    body: (
      <ul>
        <li>People in a chat can see the messages, files, reactions and pins in it, your name, picture, PIN and reading language.</li>
        <li>Anyone with your PIN or invite link can see your name, picture and reading language and start a chat with you, unless you block them.</li>
        <li>We do not sell your personal data and we do not use your messages for advertising.</li>
        <li>We may disclose data if the law requires it, or to protect people from serious harm.</li>
      </ul>
    ),
  },
  {
    id: 'retention',
    title: 'How long we keep it',
    body: (
      <ul>
        <li>Messages and files are kept until they are deleted. When you delete a message, it is removed for good, along with its files, reactions and translations, once the short undo window (about one minute) has passed.</li>
        <li>Forwarded messages are separate copies; deleting the original does not delete copies already forwarded.</li>
        <li>Presence and typing status disappear within seconds of you going offline or stopping typing.</li>
        <li>Push addresses are removed when you turn notifications off or the browser reports them as expired.</li>
        <li>When you ask us to delete your account, we delete your profile and settings and remove you from your chats. Messages you sent to others may remain visible to them unless you delete them first.</li>
      </ul>
    ),
  },
  {
    id: 'security',
    title: 'Security',
    body: (
      <p>
        Data travels over encrypted connections (HTTPS) and is stored by our providers with access controls. afjini is <strong>not end-to-end encrypted</strong>: our servers can process message content, which is what makes automatic translation and link previews possible. No system is perfectly secure, so please don&apos;t use afjini for information that would cause serious harm if exposed.
      </p>
    ),
  },
  {
    id: 'your-rights',
    title: 'Your rights',
    body: (
      <>
        <p>Depending on where you live, you may have the right to access, correct, export or delete your personal data, to object to or restrict some processing, and to complain to your local data-protection authority.</p>
        <p>
          You can change your name and picture in your account settings, change your reading language in any chat, and delete your own messages yourself. For anything else, including deleting your account or getting a copy of your data, email {mail}. We will answer within 30 days.
        </p>
      </>
    ),
  },
  {
    id: 'transfers',
    title: 'International transfers',
    body: (
      <p>
        Our providers may process data in countries other than yours, including the United States and the European Union. Where required, we rely on safeguards such as standard contractual clauses.
      </p>
    ),
  },
  {
    id: 'children',
    title: 'Children',
    body: (
      <p>
        afjini is not intended for children under {LEGAL.minAge}, or the minimum age required in your country if that is higher. If you believe a child has created an account, contact us and we will delete it.
      </p>
    ),
  },
  {
    id: 'browser-storage',
    title: 'Cookies and browser storage',
    body: (
      <p>
        We use the cookies our sign-in provider needs to keep you signed in. afjini also stores your theme and sound preferences in your browser, and its offline support caches the app&apos;s files on your device. We don&apos;t use advertising or cross-site tracking cookies.
      </p>
    ),
  },
  {
    id: 'changes',
    title: 'Changes to this policy',
    body: <p>If we make significant changes, we will update the date at the top of this page and let you know in the app before they take effect.</p>,
  },
  {
    id: 'contact',
    title: 'Contact',
    body: <p>Questions or requests about your data: {mail}, {LEGAL.company}, {LEGAL.country}.</p>,
  },
]

export default function PrivacyPolicyPage() {
  return (
    <LegalPage
      kicker="Privacy policy"
      title="Privacy Policy"
      intro="This policy explains what afjini collects, why we need it, who processes it, and the choices you have. The short version: we use your data to run your conversations, we don't sell it, and messages are not end-to-end encrypted."
      sections={sections}
      related={{ href: '/terms', label: 'Terms & Conditions' }}
    />
  )
}
