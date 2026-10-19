import { auth } from '@clerk/nextjs/server'
import { InviteView } from '@/components/invite-view'
import { pageMetadata } from '@/lib/site'

// Invite codes stay out of titles and previews so links can't be harvested from search results.
export const metadata = pageMetadata({ title: 'You’re invited', description: 'Join a conversation on afjini.', path: '/invite', noIndex: true })

export default async function Page({ params }: { params: Promise<{ code: string }> }) {
  await auth.protect()
  const { code } = await params
  return <InviteView code={code} />
}
