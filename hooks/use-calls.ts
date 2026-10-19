'use client'

import { useAction, useMutation, useQuery } from 'convex/react'
import type { FunctionReturnType } from 'convex/server'
import { api } from '@/convex/_generated/api'
import type { Id } from '@/convex/_generated/dataModel'

export type CallKind = 'voice' | 'video'
export type IncomingCall = FunctionReturnType<typeof api.calls.incoming>[number]
export type CallInChat = NonNullable<FunctionReturnType<typeof api.calls.activeIn>>

/** The call this browser is connected to. */
export type CurrentCall = { callId: Id<'calls'>; kind: CallKind; conversationId: Id<'conversations'>; chatName: string }

export function useIncomingCalls(enabled: boolean) {
  return useQuery(api.calls.incoming, enabled ? {} : 'skip') ?? []
}

/** `undefined` while loading, `null` when there's no call in that chat. */
export function useCallInChat(conversationId: Id<'conversations'> | null) {
  return useQuery(api.calls.activeIn, conversationId ? { conversationId } : 'skip')
}

export function useCallActions() {
  const start = useMutation(api.calls.start)
  const join = useMutation(api.calls.join)
  const decline = useMutation(api.calls.decline)
  const leave = useMutation(api.calls.leave)
  const token = useAction(api.calls.token)
  return { start, join, decline, leave, token }
}
