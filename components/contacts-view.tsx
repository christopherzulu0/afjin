'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useQuery } from 'convex/react'
import { ArrowRight, Check, Copy, Globe2, Search, ShieldCheck, UserPlus } from 'lucide-react'
import { SiteNav } from '@/components/site-nav'
import { SiteFooter } from '@/components/site-footer'
import { api } from '@/convex/_generated/api'
import { useCurrentUser } from '@/hooks/use-convex-chat'
import { colorFor, initialsFor, normalizePin, pinPattern } from '@/lib/chat-data'

export function ContactsView() {
  const { me } = useCurrentUser()
  const [query, setQuery] = useState('')
  const [copied, setCopied] = useState(false)
  const searchRef = useRef<HTMLInputElement>(null)
  const pin = normalizePin(query)
  const valid = pinPattern.test(pin)
  const result = useQuery(api.users.findByPin, me && valid ? { pin } : 'skip')

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        searchRef.current?.focus()
        searchRef.current?.select()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [])

  async function copyPin() {
    if (!me) return
    try {
      await navigator.clipboard?.writeText(me.pin)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1800)
    } catch {
      setCopied(false)
    }
  }

  let heading = 'Enter a PIN to find someone'
  if (query.trim() && !valid) heading = 'PINs look like AFJ-7K2P'
  else if (valid && result === undefined) heading = 'Looking up…'
  else if (valid) heading = `Results for ${pin}`

  return (
    <main className="contacts-page subpage">
      <SiteNav variant="contacts" />

      <section className="contacts-hero">
        <div className="section-kicker"><UserPlus /> Private connections</div>
        <h1>Find your people<br /><em>by afjini PIN.</em></h1>
        <p>Search a unique afjini PIN to connect with someone directly. No phone number needed, and no public directory to browse.</p>
        <div className="pin-search-card">
          <label htmlFor="pin-search">Search by afjini PIN</label>
          <div className="pin-search-input">
            <Search />
            <input
              id="pin-search"
              ref={searchRef}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="AFJ-7K2P"
              autoComplete="off"
            />
            <kbd>⌘ K</kbd>
          </div>
          <span className="search-hint">Use the 8-character PIN they shared with you. Only an exact PIN shows a person.</span>
        </div>
      </section>

      <section className="contacts-content">
        <div className="contacts-results-head">
          <div>
            <span className="section-kicker">Find a connection</span>
            <h2>{heading}</h2>
          </div>
        </div>
        <div className="contact-results">
          {result && !result.isSelf ? (
            <article className="contact-result">
              <div className={`contact-avatar contact-${colorFor(result._id)}`}>
                {result.imageUrl ? <img src={result.imageUrl} alt="" className="avatar-image" /> : initialsFor(result.name)}
              </div>
              <div className="contact-result-copy">
                <h3>{result.name}</h3>
                <div>
                  <b><Globe2 /> Reads in {result.language}</b>
                  <small>{result.pin}</small>
                </div>
              </div>
              <Link href={`/chat?pin=${result.pin}`} className="connect-button">Connect <ArrowRight /></Link>
            </article>
          ) : valid && result !== undefined ? (
            <div className="no-results">
              <Search />
              <h3>{result?.isSelf ? 'That’s your own PIN' : 'No match yet'}</h3>
              <p>{result?.isSelf ? 'Share it with the people you want to talk to.' : 'Double-check the PIN, including the hyphen, or ask your contact to share it again.'}</p>
            </div>
          ) : (
            <div className="no-results">
              <ShieldCheck />
              <h3>Private by design</h3>
              <p>There’s no public list of people. Ask your contact for their PIN, or share yours below.</p>
            </div>
          )}
        </div>
      </section>

      <section className="pin-share-section">
        <div className="pin-share-copy">
          <div className="section-kicker"><ShieldCheck /> Your private identifier</div>
          <h2>Share your PIN, not your personal details.</h2>
          <p>Your afjini PIN makes it simple to find you while keeping your phone number and email private.</p>
          <div className="pin-badge">
            <span>YOUR AFJINI PIN</span>
            <strong>{me?.pin ?? '…'}</strong>
            <button type="button" onClick={copyPin} aria-label="Copy afjini PIN" disabled={!me}>
              {copied ? <Check /> : <Copy />} {copied ? 'Copied' : 'Copy PIN'}
            </button>
          </div>
        </div>
        <div className="pin-steps">
          <div><span>01</span><b>Share your PIN</b><small>Send it in person or another trusted channel.</small></div>
          <div><span>02</span><b>They search afjini</b><small>Your profile appears only when they have your exact PIN.</small></div>
          <div><span>03</span><b>Start talking</b><small>Connect, pick your language, and let the conversation flow.</small></div>
        </div>
      </section>

      <SiteFooter tagline="Private connections. Human conversations." />
    </main>
  )
}
