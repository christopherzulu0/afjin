import { auth } from '@clerk/nextjs/server'
import { ContactsView } from '@/components/contacts-view'
import { pageMetadata } from '@/lib/site'

export const metadata = pageMetadata({ title: 'Find contacts', description: 'Find people on afjini by their PIN.', path: '/contacts', noIndex: true })

export default async function Page() {
  await auth.protect()
  return <ContactsView />
}
