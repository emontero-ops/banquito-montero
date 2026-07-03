// Service worker for Ahorros Familiares PWA
const CACHE_NAME = 'ahorros-familiares-v1';

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
        console.log('Service Worker: Instalado y caché inicial completada');
      })
      .catch((error) => {
        console.error('Service Worker: Error durante la instalación:', error);
      })
  );
});

self.addEventListener('activate', (event) => {
  // Tomamos control inmediato de las páginas
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
        console.log('Service Worker: Activado y cachés antiguos limpiados');
      })
      .catch((error) => {
        console.error('Service Worker: Error durante la activación:', error);
      })
  );
});

self.addEventListener('fetch', (event) => {
  // Ignoramos peticiones no GET o a dominios diferentes
  if (event.request.method !== 'GET' ||
      new URL(event.request.url).origin !== self.location.origin) {
    return;
  }

  event.respondWith(
    caches.match(event.request, { ignoreSearch: true })
      .then((cachedResponse) => {
        // Si tenemos una respuesta en caché, la devolvemos
        if (cachedResponse) {
          return cachedResponse;
        }

        // De lo contrario, vamos a la red
        return fetch(event.request)
          .then((networkResponse) => {
            // Verificamos que la respuesta sea válida para cachear
            if (!networkResponse || networkResponse.status !== 200 ||
                networkResponse.type !== 'basic') {
              return networkResponse;
            }

            // Clonamos la respuesta para cachearla (los streams solo se pueden consumir una vez)
            const responseToCache = networkResponse.clone();

            caches.open(CACHE_NAME)
              .then((cache) => {
                // Cacheamos la respuesta para futuras peticiones
                // Nota: En una app real, podríamos querer limitar qué se cachea
                cache.put(event.request, responseToCache);
              });

            return networkResponse;
          })
          .catch((error) => {
            console.warn('Service Worker: Error de fetch:', error);
            // En una app más avanzada, podríamos devolver una página de fallback aquí
            throw error;
          });
      })
      .catch((error) => {
        console.error('Service Worker: Error en fetch handler:', error);
        throw error;
      })
  );
});