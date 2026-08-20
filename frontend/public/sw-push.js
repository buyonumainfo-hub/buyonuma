/**
 * Custom push notification handling, appended into the Workbox-generated
 * service worker via `workbox.importScripts` (see vite.config.js). This
 * file runs in the service worker context.
 *
 * The generated SW handles caching; this adds the two pieces Workbox
 * doesn't provide out of the box — showing a notification when a push
 * arrives, and focusing/opening the right tab when the user taps it.
 */
self.addEventListener('push', (event) => {
  if (!event.data) return;
  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: 'BuyOnUma', body: event.data.text() };
  }

  const title = payload.title || 'BuyOnUma';
  const options = {
    body: payload.body || '',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-96x96.png',
    data: { url: payload.url || '/' },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(targetUrl);
    })
  );
});
