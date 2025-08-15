self.addEventListener('install', (e) => {
  e.waitUntil(caches.open('fcache-c2').then(cache => cache.addAll([
    './',
    './index.html',
    './app.js',
    './manifest.webmanifest',
    './data/terms.json',
    './assets/icons/icon-192.png',
    './assets/icons/icon-512.png'
  ])));
  self.skipWaiting();
});
self.addEventListener('activate', (e) => {
  e.waitUntil(self.clients.claim());
});
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if(e.request.method!=='GET'){ return; }
  e.respondWith(
    caches.match(e.request).then(res => {
      const fetchPromise = fetch(e.request).then(networkRes => {
        if(networkRes && networkRes.status===200 && url.origin===location.origin){
          caches.open('fcache-v2').then(cache => cache.put(e.request, networkRes.clone()));
        }
        return networkRes;
      }).catch(()=>res);
      return res || fetchPromise;
    })
  );
});
