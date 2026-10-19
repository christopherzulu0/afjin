'use client'

import { useEffect, useState } from 'react'
import { useQuery } from 'convex/react'
import { ChevronDown, Pin } from 'lucide-react'
import { api } from '@/convex/_generated/api'
import type { Id } from '@/convex/_generated/dataModel'
import { firstName } from '@/lib/chat-format'

type PinnedBarProps = { conversationId: Id<'conversations'>; onJump: (messageId: string) => void }

export function usePinnedMessages(conversationId: Id<'conversations'> | null) {
  return useQuery(api.messages.pinned, conversationId ? { conversationId } : 'skip') ?? []
}

export function PinnedBar({ conversationId, onJump }: PinnedBarProps) {
  const pins = usePinnedMessages(conversationId)
  const [index, setIndex] = useState(0)

  useEffect(() => {
    setIndex(0)
  }, [conversationId])

  if (!pins.length) return null
  const current = pins[index % pins.length]

  return (
    <div className="pinned-bar" role="region" aria-label="Pinned messages">
      <button type="button" className="pinned-bar-main" onClick={() => onJump(current._id)}>
        <Pin aria-hidden />
        <span>
          <strong>{pins.length > 1 ? `Pinned ${(index % pins.length) + 1} of ${pins.length}` : 'Pinned message'}</strong>
          <small>{firstName(current.senderName)}: {current.summary}</small>
        </span>
      </button>
      {pins.length > 1 && (
        <button type="button" className="icon-button" aria-label="Next pinned message" onClick={() => setIndex((value) => (value + 1) % pins.length)}>
          <ChevronDown />
        </button>
      )}
    </div>
  )
}
