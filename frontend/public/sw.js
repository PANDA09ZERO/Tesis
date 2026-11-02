const CACHE_NAME = 'ciencias-ingenieria-v1';
const APP_SHELL = ['/manifest.json', '/assets/pwa-192.png', '/assets/pwa-512.png', '/assets/apple-touch-icon.png', '/assets/logo.png'];
const CACHEABLE_DESTINATIONS = new Set(['script', 'style', 'image', 'font']);

self.addEventListener('install', (event) => {
  event.waitUntil(
    fetch('/')
      .then(async (response) => {
        if (!response.ok) throw new Error(`No se pudo precargar la aplicación: ${response.status}`);
        const html = await response.clone().text();
        const shellAssets = Array.from(html.matchAll(/(?:src|href)="([^"]+)"/g), ([, asset]) => new URL(asset, self.location.origin))
          .filter((url) => url.origin === self.location.origin && url.pathname.startsWith('/assets/'))
          .map((url) => url.href);
        const cache = await caches.open(CACHE_NAME);
        await cache.put('/', response);
        const assets = [...new Set([...APP_SHELL, ...shellAssets].map((asset) => new URL(asset, self.location.origin).href))];
        await cache.addAll(assets);
      })
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => Promise.all(
        cacheNames
          .filter((cacheName) => cacheName.startsWith('ciencias-ingenieria-') && cacheName !== CACHE_NAME)
          .map((cacheName) => caches.delete(cacheName))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== 'GET' || url.origin !== self.location.origin || url.pathname.startsWith('/api/') || url.pathname.startsWith('/uploads/')) {
    return;
  }

  event.respondWith((async () => {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) return cachedResponse;

    try {
      const response = await fetch(request);
      if (response.ok && CACHEABLE_DESTINATIONS.has(request.destination)) {
        const cache = await caches.open(CACHE_NAME);
        await cache.put(request, response.clone());
      }
      return response;
    } catch (error) {
      if (request.mode === 'navigate') {
        const cachedShell = await caches.match('/');
        if (cachedShell) return cachedShell;
      }
      throw error;
    }
  })());
});
