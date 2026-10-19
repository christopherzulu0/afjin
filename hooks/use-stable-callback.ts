'use client'

import { useCallback, useLayoutEffect, useMemo, useRef } from 'react'

/** Returns a function with a stable identity that always calls the latest `callback`. */
export function useStableCallback<Args extends unknown[], Result>(callback: (...args: Args) => Result) {
  const ref = useRef(callback)
  useLayoutEffect(() => {
    ref.current = callback
  })
  return useCallback((...args: Args) => ref.current(...args), [])
}

type Handlers = Record<string, (...args: never[]) => unknown>

/** Like `useStableCallback` for an object of handlers; the set of keys must not change between renders. */
export function useStableHandlers<T extends Handlers>(handlers: T): T {
  const ref = useRef(handlers)
  useLayoutEffect(() => {
    ref.current = handlers
  })
  return useMemo(() => {
    const stable = {} as Record<string, (...args: unknown[]) => unknown>
    for (const key of Object.keys(ref.current)) {
      stable[key] = (...args: unknown[]) => (ref.current[key] as (...args: unknown[]) => unknown)(...args)
    }
    return stable as unknown as T
  }, [])
}
