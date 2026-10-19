import { auth } from '@clerk/nextjs/server'
import { ChatPage } from '@/components/chat/chat-page'
import { pageMetadata } from '@/lib/site'

export const metadata = pageMetadata({ title: 'Chats', description: 'Your afjini conversations.', path: '/chat', noIndex: true })

export default async function Page() {
  await auth.protect()
  return <ChatPage />
}
