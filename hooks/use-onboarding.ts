'use client'

import { useCallback, useEffect, useState } from 'react'

const STORAGE_KEY = 'afjini:onboarding'

export type OnboardingFlags = { languageConfirmed: boolean; pinShared: boolean; dismissed: boolean }

const EMPTY: OnboardingFlags = { languageConfirmed: false, pinShared: false, dismissed: false }

function read(): OnboardingFlags {
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') as Partial<OnboardingFlags>
    return { ...EMPTY, ...value }
  } catch {
    return EMPTY
  }
}

/** Getting-started progress that can't be derived from the server, remembered per browser. */
export function useOnboarding() {
  const [flags, setFlags] = useState<OnboardingFlags>(EMPTY)

  useEffect(() => {
    setFlags(read())
  }, [])

  const mark = useCallback((key: keyof OnboardingFlags, value = true) => {
    setFlags((current) => {
      if (current[key] === value) return current
      const next = { ...current, [key]: value }
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      } catch {}
      return next
    })
  }, [])

  return { flags, mark }
}
