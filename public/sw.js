const CACHE_NAME = 'attendease-v1'; // Changed cache name to be specific to AttendEase
const urlsToCache = [
  '/',
  // Note: Next.js typically handles its own static asset caching with hashes.
  // Explicitly caching '/static/js/bundle.js' and '/static/css/main.css' might be
  // more relevant for Create React App or similar setups.
  // For Next.js, you might want to cache specific pages or assets if needed,
  // or rely on Next.js's built-in caching and PWA plugins like next-pwa.
  // For now, I'm keeping it as per your provided sw.js, but be mindful of this for Next.js.
  '/manifest.json',
  '/favicon.ico', // Added favicon as it's a common asset
  '/icons/icon-192x192.png', // Assuming this is a key icon
  '/icons/icon-512x512.png'  // Assuming this is a key icon
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache and caching initial assets:', urlsToCache);
        return cache.addAll(urlsToCache);
      })
      .catch(err => console.error('Failed to cache initial assets:', err))
  );
  self.skipWaiting(); // Ensure the new service worker activates immediately
});

self.addEventListener('activate', (event) => {
  // Clean up old caches
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.filter(name => name !== CACHE_NAME).map(name => caches.delete(name))
      );
    }).then(() => {
      console.log('Service worker activated and old caches cleaned.');
      return self.clients.claim(); // Take control of all open clients
    })
  );
});

self.addEventListener('fetch', (event) => {
  // For navigation requests, try network first, then cache (NetworkFallingBackToCache)
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // If successful, cache the response for future offline use if it's a GET request
          if (response && response.status === 200 && event.request.method === 'GET') {
            const responseToCache = response.clone();
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });
          }
          return response;
        })
        .catch(() => {
          // If network fails, try to serve from cache
          return caches.match(event.request)
            .then(cachedResponse => {
              return cachedResponse || caches.match('/'); // Fallback to home page if specific page not cached
            });
        })
    );
    return;
  }

  // For other requests (assets, API calls), use CacheFirst strategy
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        if (response) {
          return response; // Serve from cache if found
        }
        // If not in cache, fetch from network
        return fetch(event.request).then(
          (networkResponse) => {
            // If successful, cache the response for future offline use if it's a GET request
            if (networkResponse && networkResponse.status === 200 && event.request.method === 'GET') {
              const responseToCache = networkResponse.clone();
              caches.open(CACHE_NAME)
                .then(cache => {
                  cache.put(event.request, responseToCache);
                });
            }
            return networkResponse;
          }
        ).catch(err => {
          console.warn('Fetch failed for:', event.request.url, err);
          // Optionally, provide a fallback for specific asset types if needed
          // For example, for images: return caches.match('/placeholder-image.png');
        });
      })
  );
});
