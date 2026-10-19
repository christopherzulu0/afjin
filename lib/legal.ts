/** Fill these in before launch; the Privacy Policy and Terms read from here. */
export const LEGAL = {
  company: '[Company name]',
  country: '[Country]',
  email: '[legal@example.com]',
  minAge: 13,
  updated: '2026-10-19',
} as const

export function formatLegalDate(isoDate: string) {
  return new Date(`${isoDate}T00:00:00Z`).toLocaleDateString('en', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' })
}
