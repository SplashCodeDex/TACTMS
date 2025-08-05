/// <reference lib="webworker" />
import { precacheAndRoute } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { StaleWhileRevalidate } from 'workbox-strategies';

declare const self: ServiceWorkerGlobalScope;

// Precache all assets injected by VitePWA
precacheAndRoute(self.__WB_MANIFEST);

// Example of a runtime caching route
registerRoute(
  ({ url }) => url.pathname.startsWith('/api/'),
  new StaleWhileRevalidate()
);

interface SyncEvent extends Event {
  readonly tag: string;
  readonly lastChance: boolean;
  waitUntil(f: any): void;
}

interface PeriodicSyncEvent extends Event {
  readonly tag: string;
  waitUntil(f: any): void;
}

// --- PUSH NOTIFICATIONS ---

// Listen for push events
self.addEventListener('push', (event) => {
  const pushData = event.data?.json() ?? { title: 'Tithe Update', body: 'A new tithe list has been processed.' };
  
  const notificationOptions: NotificationOptions = {
    body: pushData.body,
    icon: '/img/android/android-launchericon-192-192.png',
    badge: '/img/android/android-launchericon-96-96.png',
    tag: 'tactms-notification',
  };

  const options: NotificationOptions & { vibrate: number[], renotify: boolean, actions: {action: string, title: string}[] } = {
    ...notificationOptions,
    vibrate: [200, 100, 200],
    renotify: true,
    actions: [
      { action: 'open_app', title: 'Open App' },
      { action: 'dismiss', title: 'Dismiss' },
    ],
  };

  event.waitUntil(
    self.registration.showNotification(pushData.title, options)
  );
});

// Listen for notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'open_app') {
    event.waitUntil(
      self.clients.openWindow('/')
    );
  }
});


// --- BACKGROUND SYNC ---

self.addEventListener('sync', (event) => {
  const syncEvent = event as SyncEvent;
  if (syncEvent.tag === 'sync-tithe-data') {
    syncEvent.waitUntil(
      // Here you would typically send pending data to your server
      // For example, fetch('/api/sync-data', { method: 'POST', ... })
      console.log('Background sync for tithe data triggered!')
    );
  }
});


// --- PERIODIC SYNC ---

self.addEventListener('periodicsync', (event) => {
  const periodicSyncEvent = event as PeriodicSyncEvent;
  if (periodicSyncEvent.tag === 'get-latest-updates') {
    periodicSyncEvent.waitUntil(
      // Fetch latest data from the server and update caches
      console.log('Periodic sync for latest updates triggered!')
      // e.g., fetch('/api/updates').then(response => response.json()).then(data => caches.open('api-cache').then(cache => cache.put('/api/updates', new Response(JSON.stringify(data)))))
    );
  }
});

// --- WIDGETS ---
self.addEventListener('widgetclick', (event: any) => {
  if (event.action === 'open-app') {
    event.waitUntil(self.clients.openWindow('/'));
  }
});


// --- CLEANUP ---
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((_cacheName) => {
          // Clean up old caches if needed
          return null;
        })
      );
    })
  );
});
