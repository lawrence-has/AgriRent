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

// ── Notification click handler ──────────────────────────────────
// When user taps a push notification, navigate to the relevant page.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const data = event.notification.data || {};
  const type = data.type || 'system';
  const reservationId = data.reservationId;
  const transactionId = data.transactionId;

  // Determine target URL based on notification type
  let targetUrl = '/';
  if (type === 'reservation' && reservationId) {
    // Navigate to the reservation detail — role-agnostic,
    // the app's router will redirect based on user role
    targetUrl = `/farmer/reservations/${reservationId}`;
  } else if (type === 'transaction' && transactionId) {
    targetUrl = '/farmer/rentals';
  } else if (type === 'chat') {
    targetUrl = '/chat';
  } else if (type === 'reservation') {
    targetUrl = '/farmer/reservations';
  }

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
