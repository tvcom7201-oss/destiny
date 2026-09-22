const CACHE_NAME = 'tepsa-007-v7';
const STATIC_ASSETS = [
  './',
  './index.html',
  './pages/dream.html',
  './pages/tarot.html',
  './pages/thai.html',
  './pages/chinese.html',
  './css/style.css',
  './js/app.js',
  './js/models.js',
  './js/dream.js',
  './js/tarot.js',
  './js/thai.js',
  './js/chinese.js',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons_1/128.png'
];

// Install - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS.map(url => new Request(url, { cache: 'reload' })));
    }).catch(() => {})
  );
  self.skipWaiting();
});

// Activate - clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.filter(name => name !== CACHE_NAME).map(name => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// Fetch - network first, fallback cache
self.addEventListener('fetch', (event) => {
  // Skip cross-origin requests (API calls)
  if (!event.request.url.startsWith(self.location.origin)) return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.ok) {
          const cloned = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, cloned));
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
