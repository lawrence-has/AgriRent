/**
 * Push event handler for AgriRent.
 *
 * This file is imported by the generated service worker via Workbox's
 * importScripts mechanism. It handles:
 * - Displaying push notifications when the app is in background/closed
 * - Navigating to the correct page when notification is clicked
 *
 * Note: This runs in SW context — no DOM access, no window object.
 */

// ── Push event handler — display the notification ───────────────
self.addEventListener('push', (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { title: 'AgriRent', message: event.data?.text() || 'You have a new notification' };
  }

  const title = payload.title || 'AgriRent';
  const notificationData = {
    ...(payload.data || {}),
    type: payload.type || payload.data?.type || 'system',
    url: payload.data?.url || payload.url || '/notifications',
    notificationId: payload.notificationId || payload.data?.notificationId,
  };
  const options = {
    body: payload.message || payload.body || '',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192-maskable.png',
    data: notificationData,
    // Keep each alert distinct so rapid chat/reservation events are not collapsed.
    tag: notificationData.notificationId
      ? `agrirent-${notificationData.notificationId}`
      : `agrirent-${notificationData.type}-${Date.now()}`,
    renotify: true,
    requireInteraction: true,
    vibrate: [200, 100, 200],
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// ── Notification click handler ──────────────────────────────────
// When user taps a push notification, navigate to the relevant page.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const data = event.notification.data || {};
  // Only same-origin app paths are accepted from the push payload.
  const targetUrl = typeof data.url === 'string' && data.url.startsWith('/') && !data.url.startsWith('//')
    ? data.url
    : '/notifications';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If app is already open, focus it and navigate
      for (const client of clientList) {
        if ('focus' in client) {
          client.focus();
          if ('navigate' in client) {
            client.navigate(targetUrl);
          }
          return;
        }
      }
      // App is not open — open a new window
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
