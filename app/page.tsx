import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, Check, Globe2, Mic, MessageSquareReply, Phone, Pin, QrCode, ShieldCheck, Sparkles } from 'lucide-react'
import { SiteNav } from '@/components/site-nav'
import { JsonLd, siteGraph } from '@/components/json-ld'
import { SiteFooter } from '@/components/site-footer'
import {
  CallScreen,
  CallSnippet,
  ChatListScreen,
  ConversationScreen,
  DesktopMockup,
  PhoneFrame,
  PinSnippet,
  PinnedSnippet,
  ProfileScreen,
  ReplySnippet,
  TranslationSnippet,
  VoiceSnippet,
} from '@/components/landing/mockups'
import { SITE_DESCRIPTION, SITE_TITLE, pageMetadata } from '@/lib/site'

export const metadata: Metadata = pageMetadata({ title: SITE_TITLE, description: SITE_DESCRIPTION, path: '/', absoluteTitle: true })

const screens = [
  { title: 'All your chats', text: 'Unread badges, typing, voice notes and photos at a glance.', label: 'afjini chat list with unread messages, typing and voice notes', Screen: ChatListScreen },
  { title: 'Translated conversations', text: 'Messages arrive in your language, with the original one tap away.', label: 'An afjini conversation translated from Spanish to English', Screen: ConversationScreen },
  { title: 'Voice and video calls', text: 'Call one person or the whole group, with live captions.', label: 'An afjini group video call with live translated captions', Screen: CallScreen },
  { title: 'Your private PIN', text: 'Share a PIN, link or QR code. No phone number needed.', label: 'The afjini account screen with a shareable PIN and QR code', Screen: ProfileScreen },
]

const features = [
  { title: 'Instant translation', text: 'Write in your language. Everyone reads it in theirs, automatically.', icon: Globe2, Snippet: TranslationSnippet },
  { title: 'Voice notes', text: 'Say it out loud when typing is too slow. Play back at a tap.', icon: Mic, Snippet: VoiceSnippet },
  { title: 'Replies and reactions', text: 'Answer a specific message and react without cluttering the chat.', icon: MessageSquareReply, Snippet: ReplySnippet },
  { title: 'Pinned messages', text: 'Keep flight times, addresses and plans at the top of the chat.', icon: Pin, Snippet: PinnedSnippet },
  { title: 'Connect with a PIN', text: 'Add people by PIN, invite link or QR code. No public directory.', icon: QrCode, Snippet: PinSnippet },
  { title: 'Voice and video calls', text: 'Move from messages to a call, one-to-one or with the whole group.', icon: Phone, Snippet: CallSnippet },
]

const desktopPoints = [
  { title: 'Every chat in the sidebar', text: 'Search, unread counts and who is online, always in view.' },
  { title: 'The conversation in the middle', text: 'Translations, replies, reactions and pinned messages in one thread.' },
  { title: 'Details when you need them', text: 'Shared media, members and chat settings on the right.' },
]

const steps = [
  ['01', 'Create your account', 'Sign in and choose the language you read in. You get your own afjini PIN.'],
  ['02', 'Connect with your people', 'Share your PIN, invite link or QR code to start a private chat or group.'],
  ['03', 'Talk naturally', 'Send your message. afjini translates it for everyone else in the chat.'],
]

const useCases = [
  ['Families across borders', 'Stay close to the people who matter, even when language gets in the way.', 'FR', 'Start a family group'],
  ['Friends around the world', 'Make every group chat more welcoming with effortless, natural translation.', 'FW', 'Invite your friends'],
  ['Global teams', 'Move projects forward with clear conversations, calls and less context switching.', 'GT', 'Set up a team chat'],
]

export default function LandingPage() {
  return (
    <main className="landing-page">
      <JsonLd data={siteGraph()} />
      <SiteNav variant="landing" />

      <section className="landing-hero">
        <div className="hero-copy">
          <div className="eyebrow"><Sparkles /> Communication without borders</div>
          <h1>Talk freely.<br /><em>Understand</em> instantly.</h1>
          <p>afjini is a chat app with translation built in. Message, send voice notes and call the people you love, and everyone reads in their own language.</p>
          <div className="hero-actions"><Link href="/chat" className="primary-cta">Start chatting <ArrowRight data-icon="inline-end" /></Link><a href="#screens" className="secondary-cta">See the app</a></div>
          <div className="hero-proof"><div className="proof-avatars" aria-hidden="true"><span>MR</span><span>AK</span><span>DS</span><span>+</span></div><span>Free to start · Works on phone and desktop</span></div>
        </div>
        <div className="showcase-hero">
          <PhoneFrame label="afjini chat list" className="showcase-hero-back"><ChatListScreen /></PhoneFrame>
          <PhoneFrame label="An afjini conversation translated from Spanish to English" className="showcase-hero-front"><ConversationScreen /></PhoneFrame>
        </div>
      </section>

      <section className="trust-row" aria-label="afjini highlights"><div><strong>One space</strong><span>for every conversation</span></div><div><strong>Translated</strong><span>into your language</span></div><div><strong>Calls</strong><span>voice and video</span></div><div><strong>Private</strong><span>by design</span></div></section>

      <section id="screens" className="showcase-gallery-section">
        <div className="showcase-heading">
          <div className="section-kicker">See afjini in action</div>
          <h2>A chat app that feels familiar from the first tap.</h2>
          <p className="section-intro">Everything you expect from your favourite messenger, plus translation that quietly does its job.</p>
        </div>
        <div className="showcase-gallery">
          {screens.map(({ title, text, label, Screen }) => (
            <figure key={title} className="showcase-screen">
              <PhoneFrame label={label}><Screen /></PhoneFrame>
              <figcaption><strong>{title}</strong><span>{text}</span></figcaption>
            </figure>
          ))}
        </div>
      </section>

      <section id="features" className="feature-section">
        <div className="section-kicker">Everything you need to connect</div>
        <h2>A better way to stay close.</h2>
        <p className="section-intro">The best conversations feel easy. afjini removes the little barriers so you can focus on what you really want to say.</p>
        <div className="feature-grid showcase-features">
          {features.map(({ title, text, icon: Icon, Snippet }) => (
            <Link href="/features" className="feature-card showcase-feature" key={title}>
              <Snippet />
              <div className="feature-icon"><Icon /></div>
              <h3>{title}</h3>
              <p>{text}</p>
              <ArrowRight />
            </Link>
          ))}
        </div>
      </section>

      <section className="showcase-desktop-section">
        <div className="showcase-heading">
          <div className="section-kicker">On your computer too</div>
          <h2>Just as good on a big screen.</h2>
          <p className="section-intro">Open afjini in your browser or install it like an app. Your chats stay in sync on every device.</p>
        </div>
        <DesktopMockup />
        <ol className="showcase-points">
          {desktopPoints.map((point, index) => (
            <li key={point.title}><span className="point-icon" aria-hidden="true">0{index + 1}</span><span><strong>{point.title}</strong><small>{point.text}</small></span></li>
          ))}
        </ol>
      </section>

      <section id="how-it-works" className="steps-section"><div className="steps-heading"><div className="section-kicker">Simple from the first hello</div><h2>Connection, without the complexity.</h2><p>afjini is designed to disappear into the moment. You bring the message; we take care of the distance.</p></div><div className="steps-grid">{steps.map(([number, title, description]) => <article className="step-card" key={number}><span className="step-number">{number}</span><div className="step-line" /><h3>{title}</h3><p>{description}</p></article>)}</div></section>

      <section id="translation" className="translation-section"><div><div className="section-kicker">Built for real conversations</div><h2>Your words, their language. No friction.</h2><p>Write in your language and choose the one you read in. Everyone else in the chat reads your message in theirs, with the original one tap away.</p><div className="check-list"><span><Check /> Original text always available</span><span><Check /> Pause translation for any chat</span><span><Check /> Works in groups with many languages</span></div><Link href="/chat" className="text-cta">See translation in action <ArrowRight /></Link></div><div className="language-pair"><span>You write in <b>English</b></span><Globe2 /><span>They read in <b>Spanish</b></span><Link href="/language-converter" className="language-demo-link">Try the converter <ArrowRight /></Link></div></section>

      <section id="stories" className="audience-section"><div className="section-kicker">Made for the people in your life</div><h2>Wherever your people are.</h2><div className="audience-grid">{useCases.map(([title, description, initials, cta], index) => <article className={`audience-card audience-${index + 1}`} key={title}><div className="audience-avatar" aria-hidden="true">{initials}</div><h3>{title}</h3><p>{description}</p><Link href="/chat">{cta} <ArrowRight /></Link></article>)}</div></section>

      <section id="privacy" className="privacy-strip"><ShieldCheck /><div><strong>Private by design</strong><span>No public directory, no ads. Block, mute and archive anytime, and choose which devices get notifications.</span></div><Link href="/privacy">Learn about privacy <ArrowRight /></Link></section>
      <section className="final-cta"><div><div className="section-kicker">The world is already talking</div><h2>Bring your people a little closer.</h2><p>Start a conversation that feels like you. afjini is ready when you are.</p></div><Link href="/chat" className="primary-cta">Open afjini <ArrowRight data-icon="inline-end" /></Link></section>
      <SiteFooter />
    </main>
  )
}
