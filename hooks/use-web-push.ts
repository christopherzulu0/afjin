'use client'

import { useCallback, useEffect, useState } from 'react'
import { useMutation } from 'convex/react'
import { api } from '@/convex/_generated/api'
import type { PushStatus } from '@/components/chat/sidebar'

const SERVICE_WORKER = '/sw.js'

function urlBase64ToUint8Array(value: string) {
  const padding = '='.repeat((4 - (value.length % 4)) % 4)
  const base64 = (value + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = window.atob(base64)
  const output = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i)
  return output
}

function pushSupported() {
  return typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
}

export function useWebPush(enabled: boolean) {
  const save = useMutation(api.pushSubscriptions.save)
  const remove = useMutation(api.pushSubscriptions.remove)
  const [status, setStatus] = useState<PushStatus>('default')
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY

  const persist = useCallback(
    async (subscription: PushSubscription) => {
      const json = subscription.toJSON()
      if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) throw new Error('Incomplete push subscription')
      await save({ endpoint: json.endpoint, p256dh: json.keys.p256dh, auth: json.keys.auth })
    },
    [save],
  )

  useEffect(() => {
    if (!enabled) return
    if (!pushSupported()) return setStatus('unsupported')
    if (!publicKey) return setStatus('unconfigured')
    if (Notification.permission === 'denied') return setStatus('denied')
    let cancelled = false
    navigator.serviceWorker
      .getRegistration(SERVICE_WORKER)
      .then((registration) => registration?.pushManager.getSubscription())
      .then(async (subscription) => {
        if (cancelled) return
        if (subscription) {
          await persist(subscription)
          setStatus('enabled')
        } else {
          setStatus('default')
        }
      })
      .catch(() => !cancelled && setStatus('default'))
    return () => {
      cancelled = true
    }
  }, [enabled, publicKey, persist])

  const enable = useCallback(async () => {
    if (!pushSupported() || !publicKey) return false
    setStatus('working')
    try {
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        setStatus(permission === 'denied' ? 'denied' : 'default')
        return false
      }
      const registration = await navigator.serviceWorker.register(SERVICE_WORKER)
      await navigator.serviceWorker.ready
      const subscription =
        (await registration.pushManager.getSubscription()) ??
        (await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(publicKey) }))
      await persist(subscription)
      setStatus('enabled')
      return true
    } catch {
      setStatus('default')
      return false
    }
  }, [publicKey, persist])

  const disable = useCallback(async () => {
    setStatus('working')
    try {
      const registration = await navigator.serviceWorker.getRegistration(SERVICE_WORKER)
      const subscription = await registration?.pushManager.getSubscription()
      if (subscription) {
        await remove({ endpoint: subscription.endpoint })
        await subscription.unsubscribe()
      }
    } finally {
      setStatus('default')
    }
  }, [remove])

  return { status, enable, disable }
}
