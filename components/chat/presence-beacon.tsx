'use client'

import usePresence from '@convex-dev/presence/react'
import { api } from '@/convex/_generated/api'

export function PresenceBeacon({ roomId, userId }: { roomId: string; userId: string }) {
  usePresence(api.presence, roomId, userId, 10_000, process.env.NEXT_PUBLIC_CONVEX_URL)
  return null
}
