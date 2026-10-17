self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()))

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
      data: { url: data.url || '/chat' },
    }),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const target = new URL(event.notification.data?.url || '/chat', self.location.origin).href
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windows) => {
      for (const client of windows) {
        if (client.url.startsWith(self.location.origin) && 'focus' in client) {
          client.navigate(target)
          return client.focus()
        }
      }
      return self.clients.openWindow(target)
    }),
  )
})
