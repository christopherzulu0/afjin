import { LEGAL } from '@/lib/legal'
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL, absoluteUrl } from '@/lib/site'

type JsonValue = string | number | boolean | null | JsonValue[] | JsonObject
type JsonObject = { [key: string]: JsonValue }

/** Renders structured data; `<` is escaped so content can never close the script tag. */
export function JsonLd({ data }: { data: JsonObject }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }} />
}

const ORGANIZATION_ID = absoluteUrl('/#organization')
const WEBSITE_ID = absoluteUrl('/#website')

export function siteGraph(): JsonObject {
  const organization: JsonObject = {
    '@type': 'Organization',
    '@id': ORGANIZATION_ID,
    name: SITE_NAME,
    url: SITE_URL,
    logo: absoluteUrl('/icons/512'),
  }
  if (!LEGAL.email.startsWith('[')) organization.email = LEGAL.email

  return {
    '@context': 'https://schema.org',
    '@graph': [
      organization,
      { '@type': 'WebSite', '@id': WEBSITE_ID, name: SITE_NAME, url: SITE_URL, inLanguage: 'en', publisher: { '@id': ORGANIZATION_ID } },
      {
        '@type': 'WebApplication',
        name: SITE_NAME,
        url: SITE_URL,
        description: SITE_DESCRIPTION,
        applicationCategory: 'CommunicationApplication',
        operatingSystem: 'Web, iOS, Android',
        browserRequirements: 'Requires a modern web browser with JavaScript enabled.',
        offers: { '@type': 'Offer', price: '0', priceCurrency: 'EUR' },
        featureList: [
          'Automatic message translation',
          'One-to-one and group chats',
          'Voice and video calls',
          'Pinned and forwarded messages',
          'Invite links and QR codes',
          'Installable web app',
        ],
        publisher: { '@id': ORGANIZATION_ID },
      },
    ],
  }
}

export function breadcrumbs(items: { name: string; path: string }[]): JsonObject {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [{ name: 'Home', path: '/' }, ...items].map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  }
}
