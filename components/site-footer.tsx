import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

type SiteFooterProps = {
  tagline?: string
  ctaHref?: string
  ctaLabel?: string
}

export function SiteFooter({
  tagline = 'Chat that feels human.',
  ctaHref = '/chat',
  ctaLabel = 'Open chat',
}: SiteFooterProps) {
  return (
    <footer className="landing-footer">
      <div className="footer-brand">
        <span className="brand-mark" aria-hidden="true">A</span>
        <div>
          <strong>afjini</strong>
          <span className="footer-tagline">{tagline}</span>
        </div>
      </div>
      <nav className="footer-links" aria-label="Footer">
        <Link href="/features">Features</Link>
        <Link href="/privacy">Privacy</Link>
        <Link href={ctaHref}>
          {ctaLabel} <ArrowRight />
        </Link>
      </nav>
      <span className="footer-copy">© 2026 afjini</span>
    </footer>
  )
}
