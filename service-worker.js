const CACHE_NAME = 'fcache-v3'; // <— eine Version, überall gleich
const PRECACHE_URLS = [
  './',
  './index.html',
  './app.js',
  './manifest.webmanifest',
  './data/terms.json',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // alte Caches aufräumen
      const keys = await caches.keys();
      await Promise.all(keys.map(k => k !== CACHE_NAME ? caches.delete(k) : Promise.resolve()));
      await self.clients.claim();
    })()
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  event.respondWith(
    caches.match(event.request).then(cached => {
      const fetchPromise = fetch(event.request).then(networkRes => {
        if (networkRes && networkRes.status === 200 && url.origin === location.origin) {
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, networkRes.clone()));
        }
        return networkRes;
      }).catch(() => cached);
      return cached || fetchPromise;
    })
  );
});
