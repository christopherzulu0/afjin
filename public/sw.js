const CACHE = 'afjini-shell-v1'
const OFFLINE_URL = '/offline.html'
const PRECACHE = [OFFLINE_URL, '/icon.svg', '/icons/192']
// Dev builds reuse chunk URLs, so only cache static assets on real deployments.
const CACHE_STATIC = !['localhost', '127.0.0.1'].includes(self.location.hostname)

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .catch(() => undefined)
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  )
})

function isStaticAsset(url) {
  return url.pathname.startsWith('/_next/static/') || url.pathname.startsWith('/icons/') || /\.(?:svg|png|jpg|webp|ico|woff2?)$/.test(url.pathname)
}

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return
  const url = new URL(request.url)
  // Convex, Clerk, LiveKit and other origins always go straight to the network.
  if (url.origin !== self.location.origin) return

  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(() => caches.match(OFFLINE_URL).then((response) => response ?? Response.error())))
    return
  }

  if (!CACHE_STATIC || !isStaticAsset(url)) return
  event.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const cached = await cache.match(request)
      if (cached) return cached
      const response = await fetch(request)
      if (response.ok) cache.put(request, response.clone())
      return response
    }),
  )
})

self.addEventListener('push', (event) => {
  let data = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch {
    data = { title: 'afjini', body: event.data ? event.data.text() : '' }
  }
  const title = data.title || 'afjini'
  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || 'You have a new message',
      icon: '/icon.svg',
      badge: '/icon-dark-32x32.png',
      tag: data.tag,
      renotify: Boolean(data.tag),
      requireInteraction: Boolean(data.urgent),
      data: { url: data.url || '/chat' },
    }),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const target = new URL(event.notification.data?.url || '/chat', self.location.origin).href
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(async (windows) => {
      const existing = windows.find((client) => client.url.startsWith(self.location.origin) && 'focus' in client)
      if (!existing) return self.clients.openWindow(target)
      try {
        const navigated = await existing.navigate(target)
        return (navigated ?? existing).focus()
      } catch {
        // Uncontrolled windows can't be navigated by the worker; open a fresh one instead.
        return self.clients.openWindow(target)
      }
    }),
  )
})
