import Link from 'next/link'
import { ArrowRight, ArrowUp } from 'lucide-react'

type SiteFooterProps = {
  tagline?: string
  ctaHref?: string
  ctaLabel?: string
}

const COLUMNS = [
  {
    title: 'Navigation',
    links: [
      { href: '/', label: 'Home' },
      { href: '/features', label: 'Features' },
      { href: '/how-it-works', label: 'How it works' },
      { href: '/language-converter', label: 'Language converter' },
    ],
  },
  {
    title: 'Your account',
    links: [
      { href: '/chat', label: 'Open chat' },
      { href: '/contacts', label: 'Find contacts' },
      { href: '/sign-in', label: 'Sign in' },
      { href: '/sign-up', label: 'Create an account' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { href: '/privacy', label: 'Privacy overview' },
      { href: '/privacy/policy', label: 'Privacy Policy' },
      { href: '/terms', label: 'Terms & Conditions' },
    ],
  },
]

export function SiteFooter({
  tagline = 'Chat that feels human.',
  ctaHref = '/chat',
  ctaLabel = 'Open chat',
}: SiteFooterProps) {
  return (
    <footer className="landing-footer">
      <div className="footer-top">
        <div className="footer-about">
          <Link href="/" className="footer-brand">
            <span className="brand-mark" aria-hidden="true">A</span>
            <span>
              <strong>afjini</strong>
              <span className="footer-tagline">{tagline}</span>
            </span>
          </Link>
          <p>Chat, call and share with the people you care about, each in your own language.</p>
          <Link href={ctaHref} className="footer-cta">
            {ctaLabel} <ArrowRight aria-hidden="true" />
          </Link>
        </div>
        <nav className="footer-columns" aria-label="Footer">
          {COLUMNS.map((column) => (
            <div className="footer-column" key={column.title}>
              <h2 className="footer-heading">{column.title}</h2>
              <ul>
                {column.links.map((link) => (
                  <li key={link.href}><Link href={link.href}>{link.label}</Link></li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </div>
      <div className="footer-bottom">
        <span className="footer-copy">© {new Date().getFullYear()} afjini. All rights reserved.</span>
        <a href="#top" className="footer-top-link">Back to top <ArrowUp aria-hidden="true" /></a>
      </div>
    </footer>
  )
}
