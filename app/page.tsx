'use client'

import Link from 'next/link'
import { ArrowRight, Check, Globe2, HeartHandshake, MessageCircle, ShieldCheck, Sparkles, Users } from 'lucide-react'
import { SiteNav } from '@/components/site-nav'
import { SiteFooter } from '@/components/site-footer'

const features = [
  ['Instant conversations', 'Text, photos, files, voice notes, emojis, and group chats in one calm workspace.', MessageCircle],
  ['Speak your language', 'Automatic translation keeps every reply natural, without copy and paste.', Globe2],
  ['Connected through JINN', 'Find the people you already know with private JINN PIN connections.', Users],
] as const

const steps = [
  ['01', 'Create your space', 'Set up your profile and choose the languages you use most.'],
  ['02', 'Connect with your people', 'Share a JINN PIN or invite someone directly to start a private chat.'],
  ['03', 'Talk naturally', 'Send your message. afjini translates it as the conversation unfolds.'],
]

const useCases = [
  ['Families across borders', 'Stay close to the people who matter, even when language gets in the way.', 'FR'],
  ['Friends around the world', 'Make every group chat more welcoming with effortless, natural translation.', 'FW'],
  ['Global teams', 'Move projects forward with clear conversations and less context switching.', 'GT'],
]

export default function LandingPage() {
  return (
    <main className="landing-page">
      <SiteNav variant="landing" />

      <section className="landing-hero">
        <div className="hero-copy">
          <div className="eyebrow"><Sparkles /> Communication without borders</div>
          <h1>Talk freely.<br /><em>Understand</em> instantly.</h1>
          <p>afjini brings your conversations together with thoughtful chat tools and automatic translation built right in. No switching apps. No losing the feeling behind your words.</p>
          <div className="hero-actions"><Link href="/chat" className="primary-cta">Start chatting <ArrowRight data-icon="inline-end" /></Link><a href="#how-it-works" className="secondary-cta">See how it works</a></div>
          <div className="hero-proof"><div className="proof-avatars"><span>MR</span><span>AK</span><span>DS</span><span>+</span></div><span>Made for meaningful conversations</span></div>
        </div>
        <div className="hero-visual" aria-label="Preview of an afjini translated conversation">
          <div className="hero-orbit orbit-one" aria-hidden="true" /><div className="hero-orbit orbit-two" aria-hidden="true" />
          <div className="preview-card"><div className="preview-top"><div className="preview-contact"><span className="preview-avatar">MR</span><span><strong>Maya Rodriguez</strong><small><i /> Online now</small></span></div><span className="preview-more">•••</span></div><div className="preview-banner"><Globe2 /><span><strong>Automatic translation</strong><small>English → Spanish</small></span><b>ON</b></div><div className="preview-messages"><div className="preview-msg received">Hey! Are we still on for coffee tomorrow?<small>9:34 AM · Spanish translation</small></div><div className="preview-msg sent">Absolutely. I found a new place near the park.<small>9:36 AM · English</small></div><div className="preview-msg received">That sounds perfect. See you soon!<small>9:42 AM · Spanish translation</small></div></div><div className="preview-input">Write a message...<span>⌁</span></div></div>
        </div>
      </section>

      <section className="trust-row" aria-label="afjini highlights"><div><strong>One space</strong><span>for every conversation</span></div><div><strong>100%</strong><span>human-centered</span></div><div><strong>Always on</strong><span>when connection matters</span></div><div><strong>Private</strong><span>by design</span></div></section>

      <section id="features" className="feature-section"><div className="section-kicker">Everything you need to connect</div><h2>A better way to stay close.</h2><p className="section-intro">The best conversations feel easy. afjini removes the little barriers so you can focus on what you really want to say.</p><div className="feature-grid">{features.map(([title, description, Icon]) => <Link href="/features" className="feature-card" key={title}><div className="feature-icon"><Icon /></div><h3>{title}</h3><p>{description}</p><ArrowRight /></Link>)}</div></section>

      <section id="how-it-works" className="steps-section"><div className="steps-heading"><div className="section-kicker">Simple from the first hello</div><h2>Connection, without the complexity.</h2><p>afjini is designed to disappear into the moment. You bring the message; we take care of the distance.</p></div><div className="steps-grid">{steps.map(([number, title, description]) => <article className="step-card" key={number}><span className="step-number">{number}</span><div className="step-line" /><h3>{title}</h3><p>{description}</p></article>)}</div></section>

      <section className="product-story"><div className="product-story-copy"><div className="section-kicker">A conversation, at a glance</div><h2>Everything important stays in the room.</h2><p>Switch between conversations, see who is online, and keep translation visible without covering up the humanity of the message.</p><div className="product-points"><div><span className="point-icon">01</span><span><strong>Stay in context</strong><small>Originals and translations live together.</small></span></div><div><span className="point-icon">02</span><span><strong>Make it yours</strong><small>Choose languages per conversation.</small></span></div><div><span className="point-icon">03</span><span><strong>Keep it private</strong><small>Connect with people you actually know.</small></span></div></div><Link href="/features" className="text-cta">Explore every feature <ArrowRight /></Link></div><div className="product-window"><div className="window-top"><span /><span /><span /><b>afjini / conversation</b></div><div className="window-body"><div className="window-sidebar"><strong>Chats</strong><span className="window-active">Maya Rodriguez</span><span>Family circle</span><span>Studio team</span></div><div className="window-chat"><div className="window-chat-header"><span className="preview-avatar">MR</span><span><strong>Maya Rodriguez</strong><small>English · Spanish</small></span><i /></div><div className="window-bubble">I saved you a seat.<small>Te guardé un asiento.</small></div><div className="window-bubble window-bubble-right">On my way. I&apos;ll be there soon.<small>En camino. Llegaré pronto.</small></div><div className="window-composer">Write a message... <b>↑</b></div></div></div></div></section>

      <section id="translation" className="translation-section"><div><div className="section-kicker">Built for real conversations</div><h2>Your words, their language. No friction.</h2><p>Choose the language you send in and the language you receive. afjini handles the rest while keeping the original message one tap away.</p><div className="check-list"><span><Check /> Original text always available</span><span><Check /> Language preferences per chat</span><span><Check /> Translation that stays in context</span></div><Link href="/chat" className="text-cta">See translation in action <ArrowRight /></Link></div><div className="language-pair"><span>You send in <b>English</b></span><Globe2 /><span>They receive in <b>Spanish</b></span><Link href="/language-converter" className="language-demo-link">Try the converter <ArrowRight /></Link></div></section>

      <section className="editorial-section"><div className="framed-panel"><div className="section-kicker">In the room</div><p className="framed-quote">The best conversations make room for everyone.</p><div className="frame-meta"><span>Original always nearby</span><span>Tone kept intact</span></div></div><div className="editorial-copy"><div className="section-kicker"><HeartHandshake /> Designed around people</div><h2>More than translation. A feeling of being understood.</h2><p>Language is only one part of connection. afjini keeps the warmth, rhythm, and little details of your conversations close, so distance feels a little less distant.</p><div className="editorial-stats"><div><strong>01</strong><span>One tap to see the original</span></div><div><strong>24/7</strong><span>Connection when it matters</span></div><div><strong>∞</strong><span>Stories worth sharing</span></div></div></div></section>

      <section className="family-section"><div><div className="section-kicker">For every kind of together</div><h2>Keep the everyday moments.</h2><p>From a quick check-in to a long Sunday catch-up, afjini makes room for the conversations that become memories.</p><Link href="/chat" className="primary-cta">Find your people <ArrowRight data-icon="inline-end" /></Link></div><div className="framed-panel"><div className="section-kicker">Together</div><p className="framed-quote">A quick check-in. A long Sunday. The same quiet room.</p><div className="frame-people" aria-hidden="true"><span>FR</span><span>FW</span><span>GT</span></div></div></section>

      <section id="stories" className="audience-section"><div className="section-kicker">Made for the people in your life</div><h2>Wherever your people are.</h2><div className="audience-grid">{useCases.map(([title, description, initials], index) => <article className={`audience-card audience-${index + 1}`} key={title}><div className="audience-avatar">{initials}</div><h3>{title}</h3><p>{description}</p><Link href="/chat">Start a conversation <ArrowRight /></Link></article>)}</div></section>

      <section id="privacy" className="privacy-strip"><ShieldCheck /><div><strong>Private by design</strong><span>Your conversations belong to you. Block, mute, report, and manage your notifications anytime.</span></div><Link href="/privacy">Learn about privacy <ArrowRight /></Link></section>
      <section className="final-cta"><div><div className="section-kicker">The world is already talking</div><h2>Bring your people a little closer.</h2><p>Start a conversation that feels like you. afjini is ready when you are.</p></div><Link href="/chat" className="primary-cta">Open afjini <ArrowRight data-icon="inline-end" /></Link></section>
      <SiteFooter />
    </main>
  )
}
