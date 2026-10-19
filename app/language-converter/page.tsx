'use client'

import Link from 'next/link'
import { ArrowLeft, ArrowRight, Copy, Languages, MessageCircle, RefreshCw, Sparkles, Volume2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { SiteNav } from '@/components/site-nav'
import { SiteFooter } from '@/components/site-footer'
import { canSpeak, languageCode, languages, speak } from '@/lib/speech'
import { lookupTranslation, samplePhrases } from '@/lib/translations'

export default function LanguageConverterPage() {
  const [from, setFrom] = useState('English')
  const [to, setTo] = useState('Spanish')
  const [text, setText] = useState('Hello, how are you today?')
  const [copied, setCopied] = useState(false)
  const [speechNote, setSpeechNote] = useState('')
  const exactMatch = from === to ? undefined : lookupTranslation(text, from, to)
  const translated = useMemo(() => {
    if (!text.trim()) return ''
    if (exactMatch) return exactMatch
    return `Preview: “${text}” would appear in ${to} inside an afjini chat.`
  }, [exactMatch, text, to])
  const isFallback = Boolean(text.trim()) && !exactMatch

  function swapLanguages() {
    setFrom(to)
    setTo(from)
  }

  async function copyTranslation() {
    if (!translated) return
    try {
      await navigator.clipboard?.writeText(translated)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1600)
    } catch {
      setCopied(false)
    }
  }

  function listen(content: string, language: string) {
    if (!content.trim()) return
    if (!canSpeak()) {
      setSpeechNote('Speech is unavailable in this browser.')
      window.setTimeout(() => setSpeechNote(''), 2000)
      return
    }
    setSpeechNote('')
    speak(content, language)
  }

  return (
    <main className="converter-page">
      <SiteNav variant="converter" />

      <section className="converter-hero">
        <Link href="/" className="back-link"><ArrowLeft /> Back to afjini</Link>
        <div className="eyebrow"><Sparkles /> Your words, their language</div>
        <h1>Say it naturally.<br /><em>Understand</em> instantly.</h1>
        <p>Translate a message before you send it, or use this space to find the right words. afjini keeps every translation warm, clear, and close to the original.</p>
      </section>

      <section className="converter-workspace" aria-label="Language converter">
        <div className="converter-toolbar">
          <span><Languages /> Translate a message</span>
          <small>Private by design · No account needed</small>
        </div>
        <div className="language-switcher">
          <label>
            From
            <select value={from} onChange={(event) => setFrom(event.target.value)}>
              {languages.map((language) => <option key={language}>{language}</option>)}
            </select>
          </label>
          <button className="swap-language" onClick={swapLanguages} aria-label="Swap languages"><RefreshCw /></button>
          <label>
            To
            <select value={to} onChange={(event) => setTo(event.target.value)}>
              {languages.map((language) => <option key={language}>{language}</option>)}
            </select>
          </label>
        </div>
        <div className="converter-panels">
          <div className="converter-panel">
            <div className="panel-label"><span>{from}</span><small>{text.length}/500</small></div>
            <textarea
              value={text}
              maxLength={500}
              onChange={(event) => setText(event.target.value)}
              placeholder="Write something to translate..."
              aria-label="Message to translate"
            />
            <div className="panel-footer">
              <button type="button" onClick={() => listen(text, from)} aria-label="Listen to original"><Volume2 /> Listen</button>
              <span>Translation keeps your original message available.</span>
            </div>
          </div>
          <div className="converter-panel result-panel">
            <div className="panel-label">
              <span>{to}</span>
              <span className="live-pill">{isFallback ? 'Demo preview' : 'Live preview'}</span>
            </div>
            <div className="translated-copy" lang={languageCode(to)} dir="auto">
              {translated || 'Your translation will appear here.'}
            </div>
            <div className="panel-footer">
              <button type="button" onClick={copyTranslation} aria-label="Copy translation" disabled={!translated}>
                <Copy /> {copied ? 'Copied' : 'Copy'}
              </button>
              <button type="button" onClick={() => listen(translated, to)} aria-label="Listen to translation" disabled={!translated}>
                <Volume2 /> Listen
              </button>
            </div>
          </div>
        </div>
        {speechNote && <p className="converter-speech-note" role="status">{speechNote}</p>}
        {isFallback && (
          <p className="converter-fallback-note" role="status">
            Exact phrase translations are available for the samples below. In chat, afjini translates as you talk.
          </p>
        )}
        <div className="converter-note">
          <MessageCircle />
          <span>In afjini chats, every message is translated automatically into the language each person reads in, and the original stays one tap away.</span>
          <Link href="/chat">Try it in chat <ArrowRight /></Link>
        </div>
      </section>

      <section className="phrase-section">
        <div>
          <div className="section-kicker">A little help getting started</div>
          <h2>Common phrases, ready to send.</h2>
          <p>Try a phrase below to see how afjini helps your message travel without losing its feeling.</p>
        </div>
        <div className="phrase-grid">
          {samplePhrases.map((phrase) => (
            <button key={phrase} type="button" onClick={() => setText(phrase)}>
              <span>{phrase}</span>
              <ArrowRight />
            </button>
          ))}
        </div>
      </section>
      <SiteFooter />
    </main>
  )
}
