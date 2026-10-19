'use client'

import { useCallback, useEffect, useState } from 'react'
import { INSTALL_PROMPT_EVENT, type InstallPromptWindow } from '@/components/sw-register'

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true
}

function isIos() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
}

export function useInstallPrompt() {
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null)
  const [installed, setInstalled] = useState(false)
  const [ios, setIos] = useState(false)

  useEffect(() => {
    const target = window as InstallPromptWindow
    setInstalled(isStandalone())
    setIos(isIos())
    const sync = () => setPromptEvent((target.__afjiniInstallPrompt as BeforeInstallPromptEvent | null | undefined) ?? null)
    const onInstalled = () => {
      target.__afjiniInstallPrompt = null
      setInstalled(true)
      setPromptEvent(null)
    }
    sync()
    window.addEventListener(INSTALL_PROMPT_EVENT, sync)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener(INSTALL_PROMPT_EVENT, sync)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  const install = useCallback(async () => {
    if (!promptEvent) return false
    await promptEvent.prompt()
    const { outcome } = await promptEvent.userChoice
    ;(window as InstallPromptWindow).__afjiniInstallPrompt = null
    setPromptEvent(null)
    return outcome === 'accepted'
  }, [promptEvent])

  return { canPrompt: Boolean(promptEvent), showIosHint: ios && !installed, installed, install }
}

const NUDGE_KEY = 'afjini:install-nudge'
const NUDGE_DELAY_MS = 4000
const NUDGE_SNOOZE_MS = 7 * 24 * 60 * 60 * 1000
const NUDGE_MAX_DISMISSALS = 3

type NudgeState = { dismissals: number; snoozedUntil: number }

function readNudge(): NudgeState {
  try {
    const value = JSON.parse(localStorage.getItem(NUDGE_KEY) ?? '{}') as Partial<NudgeState>
    return { dismissals: Number(value.dismissals) || 0, snoozedUntil: Number(value.snoozedUntil) || 0 }
  } catch {
    return { dismissals: 0, snoozedUntil: 0 }
  }
}

/** Decides when to proactively invite someone to install, backing off each time they say no. */
export function useInstallNudge() {
  const { canPrompt, showIosHint, installed, install } = useInstallPrompt()
  const [allowed, setAllowed] = useState(false)

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const saved = readNudge()
      setAllowed(saved.dismissals < NUDGE_MAX_DISMISSALS && Date.now() >= saved.snoozedUntil)
    }, NUDGE_DELAY_MS)
    return () => window.clearTimeout(timer)
  }, [])

  const dismiss = useCallback(() => {
    setAllowed(false)
    const saved = readNudge()
    try {
      localStorage.setItem(NUDGE_KEY, JSON.stringify({ dismissals: saved.dismissals + 1, snoozedUntil: Date.now() + NUDGE_SNOOZE_MS }))
    } catch {}
  }, [])

  const accept = useCallback(async () => {
    if (!canPrompt) return false
    setAllowed(false)
    const accepted = await install().catch(() => false)
    if (!accepted) dismiss()
    return accepted
  }, [canPrompt, install, dismiss])

  return { visible: allowed && !installed && (canPrompt || showIosHint), canPrompt, accept, dismiss }
}
