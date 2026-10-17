import { auth } from '@clerk/nextjs/server'
import { ContactsView } from '@/components/contacts-view'

export default async function Page() {
  await auth.protect()
  return <ContactsView />
}
