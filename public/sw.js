// public/sw.js

const CACHE_NAME = 'attendease-cache-v1';

// These are foundational assets that should always be cached.
const PRECACHE_ASSETS = [
    '/',
    '/manifest.json',
    '/favicon.ico',
    '/icons/apple-touch-icon.png',
];

// Install event: precache core assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[Service Worker] Pre-caching core assets');
        return cache.addAll(PRECACHE_ASSETS);
      })
      .catch(error => {
        console.error('[Service Worker] Pre-caching failed:', error);
      })
  );
  self.skipWaiting();
});

// Activate event: clean up old caches
self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (!cacheWhitelist.includes(cacheName)) {
            console.log('[Service Worker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});


// Fetch event: serve from cache, fall back to network, and cache new requests
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // --- IMPORTANT FIX ---
  // Do not cache requests that are not GET, or are for browser extensions.
  // This prevents the 'chrome-extension' scheme error.
  if (request.method !== 'GET' || request.url.startsWith('chrome-extension://')) {
    return;
  }
  
  // --- IMPORTANT FIX for Next.js ---
  // Do not cache Next.js development-specific requests, as they change frequently.
  if (request.url.includes('/_next/static/webpack/')) {
    return;
  }


  // For navigation requests (HTML pages), use a Network First strategy.
  // This ensures users always get the latest page, with an offline fallback.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .catch(() => {
          // If network fails, try to serve the root page from cache as a fallback.
          return caches.match('/');
        })
    );
    return;
  }
  
  // For all other requests (CSS, JS, images), use a Cache First strategy.
  // This provides a fast, offline-first experience for static assets.
  event.respondWith(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.match(request).then((response) => {
        if (response) {
          // Found in cache, return it.
          return response;
        }

        // Not in cache, fetch from network.
        return fetch(request).then((networkResponse) => {
          // Check if we received a valid response
          if (networkResponse && networkResponse.status === 200) {
            // Clone the response and cache it for future use.
            cache.put(request, networkResponse.clone());
          }
          return networkResponse;
        }).catch(error => {
          console.error('[Service Worker] Fetch failed; returning offline fallback if available.', request.url, error);
          // You could return a placeholder for failed images/assets here if needed.
        });
      });
    })
  );
});
