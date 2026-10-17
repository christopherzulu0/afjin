'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useId, useState } from 'react'
import { ArrowRight, Menu, X } from 'lucide-react'
import { Show, SignInButton, SignUpButton, UserButton } from '@clerk/nextjs'

const links = [
  { href: '/features', label: 'Features' },
  { href: '/how-it-works', label: 'How it works' },
  { href: '/language-converter', label: 'Language converter' },
  { href: '/contacts', label: 'Find contacts' },
  { href: '/privacy', label: 'Privacy' },
]

type SiteNavProps = {
  variant?: 'landing' | 'subpage' | 'converter' | 'contacts'
  className?: string
}

export function SiteNav({ variant = 'subpage', className = '' }: SiteNavProps) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const drawerId = useId()

  useEffect(() => {
    setOpen(false)
  }, [pathname])

  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', onKeyDown)
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previous
    }
  }, [open])

  const navClass =
    variant === 'landing'
      ? 'landing-nav'
      : variant === 'converter'
        ? 'landing-nav converter-nav'
        : variant === 'contacts'
          ? 'subpage-nav contacts-nav'
          : 'subpage-nav'

  const linksClass = variant === 'landing' || variant === 'converter' ? 'landing-links' : 'subpage-links'

  return (
    <>
      <header className={`${navClass} site-nav ${className}`.trim()}>
        <Link href="/" className="landing-brand">
          <span className="brand-mark">A</span>
          <span>afjini</span>
        </Link>
        <nav className={`${linksClass} desktop-nav-links`} aria-label="Primary">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              aria-current={pathname === link.href ? 'page' : undefined}
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="landing-nav-actions site-nav-actions">
          <Show when="signed-out">
            <SignInButton fallbackRedirectUrl="/chat">
              <button type="button" className="landing-login">Sign in</button>
            </SignInButton>
            <SignUpButton fallbackRedirectUrl="/chat">
              <button type="button" className="landing-nav-cta">
                Get started <ArrowRight data-icon="inline-end" />
              </button>
            </SignUpButton>
          </Show>
          <Show when="signed-in">
            <Link href="/chat" className="landing-nav-cta">
              Open chat <ArrowRight data-icon="inline-end" />
            </Link>
            <span className="nav-user"><UserButton /></span>
          </Show>
          <button
            type="button"
            className="nav-toggle"
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}
            aria-controls={drawerId}
            onClick={() => setOpen((value) => !value)}
          >
            {open ? <X /> : <Menu />}
          </button>
        </div>
      </header>

      <div
        className={`mobile-nav-backdrop ${open ? 'is-open' : ''}`}
        aria-hidden={!open}
        onClick={() => setOpen(false)}
      />
      <nav
        id={drawerId}
        className={`mobile-nav-drawer ${open ? 'is-open' : ''}`}
        aria-label="Mobile"
        aria-hidden={!open}
      >
        <div className="mobile-nav-drawer-top">
          <Link href="/" className="landing-brand" onClick={() => setOpen(false)}>
            <span className="brand-mark">A</span>
            <span>afjini</span>
          </Link>
          <button type="button" className="nav-toggle" aria-label="Close menu" onClick={() => setOpen(false)}>
            <X />
          </button>
        </div>
        <div className="mobile-nav-links">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              aria-current={pathname === link.href ? 'page' : undefined}
              onClick={() => setOpen(false)}
            >
              {link.label}
            </Link>
          ))}
        </div>
        <Show when="signed-out">
          <div className="mobile-nav-auth">
            <SignInButton fallbackRedirectUrl="/chat">
              <button type="button" className="mobile-nav-signin">Sign in</button>
            </SignInButton>
            <SignUpButton fallbackRedirectUrl="/chat">
              <button type="button" className="landing-nav-cta mobile-nav-cta">
                Get started <ArrowRight data-icon="inline-end" />
              </button>
            </SignUpButton>
          </div>
        </Show>
        <Show when="signed-in">
          <Link href="/chat" className="landing-nav-cta mobile-nav-cta" onClick={() => setOpen(false)}>
            Open chat <ArrowRight data-icon="inline-end" />
          </Link>
        </Show>
      </nav>
    </>
  )
}
