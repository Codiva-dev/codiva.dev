self.addEventListener('push', (event) => {
  let data = { title: 'Codiva Ops', body: '', href: '/dashboard', tag: 'codiva-ops' };
  try {
    data = { ...data, ...(event.data ? event.data.json() : {}) };
  } catch {
    data.body = event.data ? event.data.text() : '';
  }
  event.waitUntil(
    self.registration.showNotification(data.title || 'Codiva Ops', {
      body: data.body || '',
      tag: data.tag || 'codiva-ops',
      data: { href: data.href || '/dashboard' },
      icon: '/android-chrome-192x192.png',
      badge: '/android-chrome-192x192.png',
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const href = (event.notification.data && event.notification.data.href) || '/dashboard';
  const url = new URL(href, self.location.origin);
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(async (clients) => {
      for (const client of clients) {
        if (!client.url.startsWith(self.location.origin)) continue;
        if ('navigate' in client) await client.navigate(url.href);
        if ('focus' in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(url.href);
      return undefined;
    })
  );
});
