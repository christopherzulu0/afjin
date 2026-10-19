'use client'

import { useEffect } from 'react'

export const SERVICE_WORKER_URL = '/sw.js'

let registration: Promise<ServiceWorkerRegistration> | null = null

/** Registers the app's service worker once per page; push and offline support share it. */
export function registerServiceWorker() {
  registration ??= navigator.serviceWorker.register(SERVICE_WORKER_URL).catch((error: unknown) => {
    registration = null
    throw error
  })
  return registration
}

export const INSTALL_PROMPT_EVENT = 'afjini:installprompt'
export type InstallPromptWindow = Window & { __afjiniInstallPrompt?: Event | null }

export function ServiceWorkerRegister() {
  useEffect(() => {
    if ('serviceWorker' in navigator) registerServiceWorker().catch(() => undefined)
    // The browser fires this once, often before the chat UI has loaded, so keep it for later.
    const onPrompt = (event: Event) => {
      event.preventDefault()
      ;(window as InstallPromptWindow).__afjiniInstallPrompt = event
      window.dispatchEvent(new Event(INSTALL_PROMPT_EVENT))
    }
    window.addEventListener('beforeinstallprompt', onPrompt)
    return () => window.removeEventListener('beforeinstallprompt', onPrompt)
  }, [])
  return null
}
