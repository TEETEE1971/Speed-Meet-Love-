// Speed Meet Love - Service Worker for Second-Chance Date Push Notifications
self.addEventListener('install', event => {
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', event => {
  let payload = {};
  if (event.data) {
    try {
      payload = event.data.json();
    } catch (e) {
      payload = { title: 'Speed Meet Love', body: event.data.text() };
    }
  }

  const title = payload.title || 'Second-Chance Date Invitation ❤️';
  const options = {
    body: payload.body || 'A mutual match invited you to a 10-minute video date!',
    icon: payload.icon || '/assets/kristy_exact.png',
    badge: '/assets/kristy_exact.png',
    tag: payload.tag || `sml_second_date_${Date.now()}`,
    data: payload.data || { url: '/?view=matches', sessionId: payload.sessionId },
    vibrate: [200, 100, 200],
    requireInteraction: true,
    actions: [
      { action: 'accept', title: 'Accept ❤️' },
      { action: 'decline', title: 'Decline' },
    ],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const action = event.action;
  const sessionData = event.notification.data || {};
  const targetUrl = sessionData.url || '/?view=matches';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windowClients => {
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.postMessage({
            type: 'SECOND_DATE_NOTIFICATION_ACTION',
            action,
            data: sessionData,
          });
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
