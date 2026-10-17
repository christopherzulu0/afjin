import { auth } from '@clerk/nextjs/server'
import { ChatPage } from '@/components/chat/chat-page'

export default async function Page() {
  await auth.protect()
  return <ChatPage />
}
