'use client'

import dynamic from 'next/dynamic'
import { Suspense } from 'react'

function ChatLoading() {
  return (
    <main className="app-shell chat-loading" aria-busy="true">
      <div className="chat-loading-card">
        <div className="brand-mark">A</div>
        <span>Loading your conversations…</span>
      </div>
    </main>
  )
}

const ChatApp = dynamic(() => import('@/components/chat/chat-app'), { ssr: false, loading: ChatLoading })

export function ChatPage() {
  return (
    <Suspense fallback={<ChatLoading />}>
      <ChatApp />
    </Suspense>
  )
}
