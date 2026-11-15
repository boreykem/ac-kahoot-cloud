// AC-GAME! Service Worker for Desktop PWA Installation
const CACHE_NAME = 'ac-game-pwa-v2';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  // Ignore non-GET, WebSockets, and non-http(s) requests
  if (event.request.method !== 'GET' || !event.request.url.startsWith('http')) return;
  // Let network handle dynamic requests, fallback gracefully
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});
