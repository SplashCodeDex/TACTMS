/// <reference lib="webworker" />
import { precacheAndRoute, createHandlerBoundToURL } from "workbox-precaching";
import { NavigationRoute, registerRoute } from "workbox-routing";
import {
  StaleWhileRevalidate,
  NetworkFirst,
  NetworkOnly,
} from "workbox-strategies";
import { CacheableResponsePlugin } from "workbox-cacheable-response";
import { ExpirationPlugin } from "workbox-expiration";
import { Queue } from "workbox-background-sync";

// Serve offline.html for navigation requests when offline
const offlineHandler = createHandlerBoundToURL("offline.html");
const navigationRoute = new NavigationRoute(offlineHandler, {
  denylist: [/\/api\//], // Don't serve for API requests
});
registerRoute(navigationRoute);

declare const self: ServiceWorkerGlobalScope;

// Precache all assets injected by VitePWA
precacheAndRoute(self.__WB_MANIFEST);

// --- RUNTIME CACHING ---

// 1. Google Drive API Caching (and other Google APIs)
// Strategy: StaleWhileRevalidate - Serve from cache first, then update in the background.
// This is ideal for data that is not critical to be real-time, but benefits from being available instantly.
registerRoute(
  ({ url }) => url.hostname === "www.googleapis.com",
  new StaleWhileRevalidate({
    cacheName: "google-api-cache",
    plugins: [
      new CacheableResponsePlugin({
        statuses: [0, 200], // Cache successful responses
      }),
      new ExpirationPlugin({
        maxEntries: 50, // Maximum number of entries to cache
        maxAgeSeconds: 30 * 24 * 60 * 60, // 30 Days
      }),
    ],
  }),
);

// 2. Generic API Caching (for future APIs)
// Strategy: NetworkFirst for GET, NetworkOnly for others.
// This ensures GET requests are cached for offline use, while mutations (POST, etc.) are not.
registerRoute(
  ({ url, request }) =>
    url.pathname.startsWith("/api/") && request.method === "GET",
  new NetworkFirst({
    cacheName: "api-cache",
    plugins: [
      new CacheableResponsePlugin({
        statuses: [0, 200],
      }),
      new ExpirationPlugin({
        maxEntries: 30,
        maxAgeSeconds: 24 * 60 * 60, // 1 Day
      }),
    ],
  }),
);

registerRoute(
  ({ url, request }) =>
    url.pathname.startsWith("/api/") && request.method !== "GET",
  new NetworkOnly(),
);

// 3. Image Caching (if you load images from external sources)
// Strategy: StaleWhileRevalidate
registerRoute(
  ({ request }) => request.destination === "image",
  new StaleWhileRevalidate({
    cacheName: "image-cache",
    plugins: [
      new ExpirationPlugin({
        maxEntries: 60,
        maxAgeSeconds: 30 * 24 * 60 * 60, // 30 Days
      }),
    ],
  }),
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
self.addEventListener("push", (event) => {
  const pushData = event.data?.json() ?? {
    title: "Tithe Update",
    body: "A new tithe list has been processed.",
  };

  const notificationOptions: NotificationOptions = {
    body: pushData.body,
    icon: "/img/android/android-launchericon-192-192.png",
    badge: "/img/android/android-launchericon-96-96.png",
    tag: "tactms-notification",
  };

  const options: NotificationOptions & {
    vibrate: number[];
    renotify: boolean;
    actions: { action: string; title: string }[];
  } = {
    ...notificationOptions,
    vibrate: [200, 100, 200],
    renotify: true,
    actions: [
      { action: "open_app", title: "Open App" },
      { action: "dismiss", title: "Dismiss" },
    ],
  };

  event.waitUntil(self.registration.showNotification(pushData.title, options));
});

// Listen for notification clicks
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  if (event.action === "open_app") {
    event.waitUntil(self.clients.openWindow("./"));
  }
});

// --- BACKGROUND SYNC ---

self.addEventListener("sync", (event) => {
  const syncEvent = event as SyncEvent;
  if (syncEvent.tag === "sync-tithe-data") {
    syncEvent.waitUntil(
      // Here you would typically send pending data to your server
      // For example, fetch('/api/sync-data', { method: 'POST', ... })
      console.log("Background sync for tithe data triggered!"),
    );
  }
});

// --- PERIODIC SYNC ---

self.addEventListener("periodicsync", (event) => {
  const periodicSyncEvent = event as PeriodicSyncEvent;
  if (periodicSyncEvent.tag === "get-latest-updates") {
    periodicSyncEvent.waitUntil(
      // Fetch latest data from the server and update caches
      console.log("Periodic sync for latest updates triggered!"),
      // e.g., fetch('/api/updates').then(response => response.json()).then(data => caches.open('api-cache').then(cache => cache.put('/api/updates', new Response(JSON.stringify(data)))))
    );
  }
});

// --- WIDGETS ---
self.addEventListener("widgetclick", (event: any) => {
  if (event.action === "open-app") {
    event.waitUntil(self.clients.openWindow("./"));
  }
});

// --- CLEANUP ---
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      const cachesToKeep = [
        "google-api-cache",
        "api-cache",
        "image-cache",
        "analytics-queue", // Workbox queue cache
      ];

      return Promise.all(
        cacheNames.map((cacheName) => {
          if (!cachesToKeep.includes(cacheName) && !cacheName.startsWith('workbox-precache')) {
            return caches.delete(cacheName);
          }
          return Promise.resolve();
        }),
      );
    }),
  );
});

// --- SKIP WAITING ---
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

const analyticsSyncQueue = new Queue("analytics-queue", {
  maxRetentionTime: 24 * 60, // Retry for max of 24 Hours
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "QUEUE_ANALYTICS_EVENT") {
    const { payload } = event.data;

    const promiseChain = fetch("api/analytics", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    }).catch(() => {
      // The request failed, so we'll queue it for later.
      return analyticsSyncQueue.pushRequest({
        request: new Request("api/analytics", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }),
      });
    });

    event.waitUntil(promiseChain);
  }
});
