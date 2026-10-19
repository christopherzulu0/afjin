import Link from 'next/link'
import type { ReactNode } from 'react'
import { FileText } from 'lucide-react'
import { SiteFooter } from '@/components/site-footer'
import { SiteNav } from '@/components/site-nav'
import { LEGAL, formatLegalDate } from '@/lib/legal'

export type LegalSection = { id: string; title: string; body: ReactNode }

type LegalPageProps = {
  kicker: string
  title: string
  intro: ReactNode
  sections: LegalSection[]
  related: { href: string; label: string }
}

export function LegalPage({ kicker, title, intro, sections, related }: LegalPageProps) {
  const isDraft = Object.values(LEGAL).some((value) => typeof value === 'string' && value.startsWith('['))
  return (
    <main className="subpage legal-page">
      <SiteNav />
      <header className="subpage-hero legal-hero">
        <div className="section-kicker"><FileText /> {kicker}</div>
        <h1>{title}</h1>
        <p>{intro}</p>
        <p className="legal-meta">
          Last updated <time dateTime={LEGAL.updated}>{formatLegalDate(LEGAL.updated)}</time> · <Link href={related.href}>{related.label}</Link>
        </p>
      </header>
      <div className="legal-layout">
        <nav className="legal-toc" aria-label="On this page">
          <strong>On this page</strong>
          <ol>
            {sections.map((section, index) => (
              <li key={section.id}><a href={`#${section.id}`}><span aria-hidden="true">{index + 1}.</span> {section.title}</a></li>
            ))}
          </ol>
        </nav>
        <article className="legal-body">
          {sections.map((section, index) => (
            <section className="legal-section" id={section.id} key={section.id} aria-labelledby={`${section.id}-title`}>
              <h2 id={`${section.id}-title`}><span aria-hidden="true">{index + 1}.</span> {section.title}</h2>
              {section.body}
            </section>
          ))}
          {isDraft && (
            <p className="legal-note" role="note">
              Draft: the bracketed details are placeholders. This text is a starting point, not legal advice; have it reviewed by a qualified lawyer before launch.
            </p>
          )}
        </article>
      </div>
      <SiteFooter ctaHref="/" ctaLabel="Back to home" />
    </main>
  )
}
