'use client'

import { useCallback, useSyncExternalStore } from 'react'

/** Unsent drafts per conversation, kept outside React state so typing only re-renders subscribers. */
const drafts = new Map<string, string>()
const listeners = new Map<string, Set<() => void>>()

export function getDraft(conversationId: string) {
  return drafts.get(conversationId) ?? ''
}

export function setDraft(conversationId: string, text: string) {
  if (getDraft(conversationId) === text) return
  if (text) drafts.set(conversationId, text)
  else drafts.delete(conversationId)
  listeners.get(conversationId)?.forEach((listener) => listener())
}

export function useDraft(conversationId: string) {
  const subscribe = useCallback((listener: () => void) => {
    let set = listeners.get(conversationId)
    if (!set) listeners.set(conversationId, (set = new Set()))
    set.add(listener)
    return () => {
      set.delete(listener)
    }
  }, [conversationId])
  const read = useCallback(() => getDraft(conversationId), [conversationId])
  return useSyncExternalStore(subscribe, read, () => '')
}
