'use client'

import { useEffect, useRef } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { inviteUrl } from '@/lib/invite'

export function useMyInvite(enabled: boolean) {
  const code = useQuery(api.invites.myInvite, enabled ? {} : 'skip')
  const ensure = useMutation(api.invites.ensureMyInvite)
  const reset = useMutation(api.invites.resetMyInvite)
  const requested = useRef(false)

  useEffect(() => {
    if (!enabled || code !== null || requested.current) return
    requested.current = true
    ensure().catch(() => {
      requested.current = false
    })
  }, [enabled, code, ensure])

  return { code: code ?? null, url: code ? inviteUrl(code) : null, reset }
}
