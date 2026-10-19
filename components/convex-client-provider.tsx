'use client'

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useAuth } from '@clerk/nextjs'
import { ConvexProviderWithAuth, ConvexReactClient } from 'convex/react'

// Errors thrown on purpose with ConvexError (blocked, not a member, rate limits) are shown
// in the UI, so they're logged as warnings instead of triggering the Next.js error overlay.
const logger = {
  logVerbose: () => {},
  log: (...args: unknown[]) => console.log(...args),
  warn: (...args: unknown[]) => console.warn(...args),
  error: (...args: unknown[]) => {
    if (args.some((arg) => typeof arg === 'string' && arg.includes('Uncaught ConvexError'))) console.warn(...args)
    else console.error(...args)
  },
}

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!, { logger })

function waitForNetwork(attempt: number) {
  return new Promise<void>((resolve) => {
    if (!navigator.onLine) {
      window.addEventListener('online', () => resolve(), { once: true })
      return
    }
    window.setTimeout(resolve, Math.min(8000, 500 * 2 ** attempt))
  })
}

function isFresh(token: string) {
  try {
    const payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
    const { exp } = JSON.parse(window.atob(payload)) as { exp?: number }
    return typeof exp !== 'number' || exp * 1000 > Date.now() + 5000
  } catch {
    return true
  }
}

function useOnlineEpoch() {
  const [epoch, setEpoch] = useState(0)
  useEffect(() => {
    const bump = () => setEpoch((value) => value + 1)
    window.addEventListener('online', bump)
    return () => window.removeEventListener('online', bump)
  }, [])
  return epoch
}

function useAuthFromClerk() {
  const { isLoaded, isSignedIn, getToken, orgId, orgRole, sessionId, sessionClaims } = useAuth()
  const onlineEpoch = useOnlineEpoch()
  const usesIntegration = sessionClaims?.aud === 'convex'

  const fetchAccessToken = useCallback(
    async ({ forceRefreshToken }: { forceRefreshToken: boolean }) => {
      for (let attempt = 0; attempt < 8; attempt++) {
        const skipCache = forceRefreshToken || attempt > 0
        try {
          const token = await getToken(usesIntegration ? { skipCache } : { template: 'convex', skipCache })
          // Convex gives up and drops auth if it's handed an expired or repeated token,
          // so a stale cached token counts as "no token yet".
          if (token && isFresh(token)) return token
        } catch {
          // Fall through to the retry below.
        }
        // Returning null tells Convex the user signed out, which would replay queued
        // messages unauthenticated. While offline or on a transient failure, wait instead.
        if (!navigator.onLine || attempt < 3) {
          await waitForNetwork(attempt)
          continue
        }
        return null
      }
      return null
    },
    // A new function makes Convex call setAuth again, so this also re-authenticates after reconnecting.
    [getToken, orgId, orgRole, sessionId, usesIntegration, onlineEpoch],
  )

  return useMemo(
    () => ({ isLoading: !isLoaded, isAuthenticated: isSignedIn ?? false, fetchAccessToken }),
    [isLoaded, isSignedIn, fetchAccessToken],
  )
}

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  return (
    <ConvexProviderWithAuth client={convex} useAuth={useAuthFromClerk}>
      {children}
    </ConvexProviderWithAuth>
  )
}
