'use client'

import { useCallback, useState } from 'react'

const STORAGE_KEY = 'afjini:sounds'

function readPreference() {
  if (typeof window === 'undefined') return true
  try {
    return window.localStorage.getItem(STORAGE_KEY) !== 'off'
  } catch {
    return true
  }
}

export function useSoundPreference() {
  const [soundOn, setSoundOnState] = useState(readPreference)

  const setSoundOn = useCallback((value: boolean) => {
    setSoundOnState(value)
    try {
      window.localStorage.setItem(STORAGE_KEY, value ? 'on' : 'off')
    } catch {
      // Private mode or blocked storage: keep the choice for this session only.
    }
  }, [])

  return { soundOn, setSoundOn }
}
