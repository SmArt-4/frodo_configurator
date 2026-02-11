
const CACHE_VERSION = 'v1.2.1';
const CACHE_NAME = `frodo-${CACHE_VERSION}`;
const CORE_ASSETS = [
  './frodo.html',
  './manifest.json'
  // Icons are optional for offline; they'll be fetched when online
  // './frodo-192.png',
  // './frodo-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    // Cache core assets, but don't fail install if one is missing
    await Promise.all(
      CORE_ASSETS.map(async (url) => {
        try { await cache.add(url); } catch (e) { /* ignore missing */ }
      })
    );
    self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    // Clean old caches
    const keys = await caches.keys();
    await Promise.all(keys.map((key) => {
      if (key !== CACHE_NAME && key.startsWith('frodo-')) {
        return caches.delete(key);
      }
    }));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const req = event.request;

  // For navigations, return cached shell (frodo.html) if offline
  if (req.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const fresh = await fetch(req);
        return fresh;
      } catch (_) {
        const cache = await caches.open(CACHE_NAME);
        const cached = await cache.match('./frodo.html');
        return cached || new Response('Offline and no cached shell', { status: 503 });
      }
    })());
    return;
  }

  // For other requests: cache-first, then network
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(req);
    if (cached) return cached;
    try {
      const resp = await fetch(req);
      // Cache same-origin GET requests only
      if (req.method === 'GET' && new URL(req.url).origin === self.location.origin) {
        cache.put(req, resp.clone());
      }
      return resp;
    } catch (e) {
      // Fallback to nothing
      return new Response('Offline', { status: 503 });
    }
  })());
});
