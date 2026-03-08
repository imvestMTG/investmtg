/* sw.js — Service Worker for investMTG PWA */
/* CACHE_VERSION: bump this on every deployment so browsers pick up new files */
var CACHE_NAME = 'investmtg-v12';
var STATIC_ASSETS = [
  '/style.css',
  '/base.css',
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
        names.map(function(name) {
          if (name !== CACHE_NAME) return caches.delete(name);
        })
      );
    }).then(function() {
      return self.clients.claim();
    }).then(function() {
      /* Notify all open tabs to reload for fresh JS */
      return self.clients.matchAll({ type: 'window' }).then(function(clients) {
        clients.forEach(function(client) {
          client.postMessage({ type: 'SW_UPDATED', version: CACHE_NAME });
        });
      });
    })
  );
});

self.addEventListener('fetch', function(event) {
  var req = event.request;
  var url = new URL(req.url);

  /* Only handle GET requests */
  if (req.method !== 'GET') return;

  /* Never cache navigation requests (HTML) — always fetch fresh index.html */
  if (req.mode === 'navigate' || req.destination === 'document') {
    event.respondWith(
      fetch(req).catch(function() {
        return caches.match('/') || caches.match('/index.html');
      })
    );
    return;
  }

  /* Never cache JS/MJS files — always fetch fresh to pick up deployments */
  if ((url.pathname.endsWith('.js') || url.pathname.endsWith('.mjs')) && url.origin === self.location.origin) {
    event.respondWith(
      fetch(req).catch(function() {
        return caches.match(req);
      })
    );
    return;
  }

  /* Never intercept cross-origin requests (esm.sh, Scryfall, backend, etc.) */
  if (url.origin !== self.location.origin) return;

  /* For CSS, manifest, images: cache-first with network fallback */
  event.respondWith(
    caches.match(req).then(function(cached) {
      if (cached) return cached;
      return fetch(req).then(function(response) {
        if (response && response.status === 200 && response.type === 'basic') {
          var clone = response.clone();
          caches.open(CACHE_NAME).then(function(cache) {
            cache.put(req, clone);
          });
        }
        return response;
      });
    })
  );
});
