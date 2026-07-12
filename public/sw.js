// Service worker for Banquito Montero PWA
const CACHE_NAME = 'banquito-montero-v1';

// Lista de URLs a cachear durante la instalación
// Usamos rutas relativas que funcionarán tanto en desarrollo como en GitHub Pages
const URLS_TO_CACHE = [
  '/',                           // Home
  '/index.html',                 // Main HTML
  '/manifest.json',              // PWA Manifest
  // No incluimos assets específicos aquí para evitar 404 si no existen
  // Los assets se cachearán dinámicamente cuando se soliciten
];

self.addEventListener('install', (event) => {
  // Skip waiting to activate immediately
  self.skipWaiting();

  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        // Intentamos cachear cada URL individualmente
        return Promise.all(
          URLS_TO_CACHE.map((url) =>
            cache.add(url).catch((error) => {
              console.warn(`Service Worker: Failed to cache ${url}`, error);
              // Continuamos aunque falle al cachear esta URL
              return null;
            })
          )
        );
      })
      .then(() => {
        console.log('Service Worker: Installed and initial cache completed');
      })
      .catch((error) => {
        console.error('Service Worker: Error during installation:', error);
      })
  );
});

self.addEventListener('activate', (event) => {
  // Take control of the pages immediately
  event.waitUntil(
    self.clients.claim()
      .then(() => {
        return caches.keys()
          .then((cacheNames) => {
            return Promise.all(
              cacheNames
                .filter((cacheName) => cacheName !== CACHE_NAME)
                .map((cacheName) => caches.delete(cacheName))
            );
          });
      })
      .then(() => {
        console.log('Service Worker: Activated and old caches cleared');
      })
      .catch((error) => {
        console.error('Service Worker: Error during activation:', error);
      })
  );
});

self.addEventListener('fetch', (event) => {
  // Ignore non-GET requests or requests to different origins
  if (event.request.method !== 'GET' ||
      new URL(event.request.url).origin !== self.location.origin) {
    return;
  }

  event.respondWith(
    caches.match(event.request, { ignoreSearch: true })
      .then((cachedResponse) => {
        // If we have a cached response, return it
        if (cachedResponse) {
          return cachedResponse;
        }

        // Otherwise, go to the network
        return fetch(event.request)
          .then((networkResponse) => {
            // Check if the response is valid for caching
            if (!networkResponse || networkResponse.status !== 200 ||
                networkResponse.type !== 'basic') {
              return networkResponse;
            }

            // Clone the response because it's a stream that can only be consumed once
            const responseToCache = networkResponse.clone();

            caches.open(CACHE_NAME)
              .then((cache) => {
                // Cache the response for future requests
                // Note: In a real app, we might want to limit what we cache
                cache.put(event.request, responseToCache);
              });

            return networkResponse;
          })
          .catch((error) => {
            console.warn('Service Worker: Fetch error:', error);
            // In a more advanced app, we could return a fallback page here
            throw error;
          });
      })
      .catch((error) => {
        console.error('Service Worker: Error in fetch handler:', error);
        throw error;
      })
  );
});