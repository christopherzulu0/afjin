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
