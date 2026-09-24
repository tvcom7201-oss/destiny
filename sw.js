const CACHE_NAME = 'tepsa-007-v18';
const STATIC_ASSETS = [
  './',
  './index.html',
  './pages/dream.html',
  './pages/tarot.html',
  './pages/thai.html',
  './pages/chinese.html',
  './pages/indian.html',
  './pages/western.html',
  './css/style.css',
  './js/app.js',
  './js/models.js',
  './js/dream.js',
  './js/tarot.js',
  './js/thai.js',
  './js/chinese.js',
  './js/western.js',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons_1/128.png',
  './icons_1/512.png',
  './icons_2/512.png',
  './icons_3/512.png',
  './icons_4/512.png',
  './icons_5/512.png',
  './icons_6/512.png',
  './icons_1/1.mp3',
  './icons_2/2.mp3',
  './icons_2/2-0.mp3',
  './icons_3/3.mp3',
  './icons_4/4.mp3',
  './icons_5/5.mp3',
  './icons_6/6.mp3'
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
  if (!event.request.url.startsWith(self.location.origin) || event.request.method !== 'GET') return;

  const liveDestinations = new Set(['document', 'script', 'style']);
  const request = liveDestinations.has(event.request.destination)
    ? new Request(event.request, { cache: 'no-store' })
    : event.request;

  event.respondWith(
    fetch(request)
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
