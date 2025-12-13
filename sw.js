// Nombre de la caché (DEBE ser único para cada nueva versión)
const CACHE_NAME = 'maze-eater-pwa-v2';

// Lista de archivos que necesita el juego para funcionar sin conexión
const URLS_TO_CACHE = [
  './', 
  './Index.html',
  './manifest.json',
  './game.js', // El archivo de lógica del juego
  './MazeEater-192.png',
  './MazeEater-512.png'
];

// 1. EVENTO INSTALL
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Precargando recursos...');
        return cache.addAll(URLS_TO_CACHE);
      })
      .then(() => self.skipWaiting())
  );
});

// 2. EVENTO ACTIVATE
self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            console.log('Service Worker: Eliminando caché antigua:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 3. EVENTO FETCH (Estrategia Cache-First)
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Devuelve el recurso de la caché si está disponible
        if (response) {
          return response;
        }
        // Si no está, va a la red
        return fetch(event.request);
      })
  );

});

