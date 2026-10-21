'use client'

import { useCallback, useSyncExternalStore } from 'react'
import { DEFAULT_THEME, THEME_STORAGE_KEY, applyTheme, readPreference, type ThemePreference } from '@/lib/theme'

const listeners = new Set<() => void>()

function notify() {
  listeners.forEach((listener) => listener())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  const media = window.matchMedia('(prefers-color-scheme: light)')
  const onSystemChange = () => {
    if (readPreference() === 'system') applyTheme('system')
  }
  const onStorage = (event: StorageEvent) => {
    if (event.key !== THEME_STORAGE_KEY) return
    applyTheme(readPreference())
    notify()
  }
  media.addEventListener('change', onSystemChange)
  window.addEventListener('storage', onStorage)
  return () => {
    listeners.delete(listener)
    media.removeEventListener('change', onSystemChange)
    window.removeEventListener('storage', onStorage)
  }
}

export function useTheme() {
  const preference = useSyncExternalStore<ThemePreference>(subscribe, readPreference, () => DEFAULT_THEME)
  const setPreference = useCallback((next: ThemePreference) => {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next)
    } catch {}
    applyTheme(next)
    notify()
  }, [])
  return { preference, setPreference }
}
