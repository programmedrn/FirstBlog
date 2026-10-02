// Offline support for the Health Home tools, so the 10 x (10s/30s) timer keeps working when installed.
// The scope is this folder: the shared CSS, modules and sounds live here too, outside each tool's folder.
const VERSION = 'health-home-v1';
const SHELL = [
  './interval-10-30/',
  './interval-10-30/index.html',
  './interval-10-30/manifest.json',
  './interval-10-30/js/interval1030.js',
  './interval-10-30/icons/icon-192.png',
  './interval-10-30/icons/icon-512.png',
  './shared/css/index.css',
  './shared/js/utils/dom.js',
  './shared/js/utils/state.js',
  './shared/js/utils/wakeLock.js',
  './shared/js/components/audio.js',
  './shared/assets/beep.mp3',
  './shared/assets/beep2.mp3'
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(VERSION).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== VERSION).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET' || new URL(request.url).origin !== location.origin) {
    return;
  }
  // Serve from the cache for speed and offline use, and refresh the copy in the background.
  event.respondWith(
    caches.match(request).then((cached) => {
      const fresh = fetch(request)
        .then((response) => {
          if (response && response.ok) {
            const copy = response.clone();
            caches.open(VERSION).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => cached);
      return cached || fresh;
    })
  );
});
