// Service Worker for PWA (v2 - Clean Navigation & Asset Cache)
const CACHE_NAME = 'infrareport-v2';
const urlsToCache = [
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png'
];

// Install event - cache static assets safely
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      await Promise.allSettled(
        urlsToCache.map((url) =>
          fetch(url, { cache: 'no-cache' }).then((res) => {
            if (res && res.status === 200) {
              return cache.put(url, res);
            }
          })
        )
      );
    })
  );
  self.skipWaiting();
});

// Activate event - clean all old caches immediately
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('SW: Clearing legacy cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch event - network-first for HTML & dynamic routes, cache for static icons/manifest
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // 1. Skip cross-origin requests (Google Maps, map tiles, Cloudinary)
  if (url.origin !== self.location.origin) {
    return;
  }

  // 2. Skip API calls, Next.js internal bundles & data, and HTML document navigation
  if (
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/_next/') ||
    event.request.mode === 'navigate' ||
    event.request.headers.get('accept')?.includes('text/html')
  ) {
    return;
  }

  // 3. For static assets (icons, manifest), attempt cache first with network fallback
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});
