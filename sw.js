/* sw.js — Service Worker for investMTG PWA */
/* CACHE_VERSION: bump this on every deployment so browsers pick up new files */
var CACHE_NAME = 'investmtg-v2';
var STATIC_ASSETS = [
  '/',
  '/index.html',
  '/style.css',
  '/app.js',
  '/manifest.json'
];

self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  /* Activate immediately — don't wait for old tabs to close */
  self.skipWaiting();
});

self.addEventListener('activate', function(event) {
  /* Delete ALL old caches so stale JS/CSS never gets served */
  event.waitUntil(
    caches.keys().then(function(names) {
      return Promise.all(
        names.filter(function(name) { return name !== CACHE_NAME; })
          .map(function(name) { return caches.delete(name); })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', function(event) {
  /* Network-first for everything — ensures deployments take effect immediately.
     Falls back to cache only when offline. */
  event.respondWith(
    fetch(event.request).then(function(response) {
      /* Cache successful responses for offline fallback */
      if (response.status === 200 && response.type === 'basic') {
        var clone = response.clone();
        caches.open(CACHE_NAME).then(function(cache) {
          cache.put(event.request, clone);
        });
      }
      return response;
    }).catch(function() {
      /* Offline — serve from cache if available */
      return caches.match(event.request);
    })
  );
});
