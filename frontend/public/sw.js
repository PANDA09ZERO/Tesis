// Service worker de la app instalable (PWA).
// - Páginas (navegación): primero la red, para que cada publicación en Vercel se vea al instante;
//   sin conexión se muestra la última versión guardada.
// - Scripts, estilos, imágenes y fuentes con nombre versionado: primero la caché.
// - La API (/api) y los archivos subidos (/uploads) nunca se guardan.
const CACHE_NAME = 'ciencias-ingenieria-v2';
const APP_SHELL = ['/manifest.json', '/assets/pwa-192.png', '/assets/pwa-512.png', '/assets/pwa-maskable-192.png', '/assets/pwa-maskable-512.png', '/assets/apple-touch-icon.png', '/assets/logo.png'];
const CACHEABLE_DESTINATIONS = new Set(['script', 'style', 'image', 'font']);

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(async (cache) => {
        const response = await fetch('/', { cache: 'no-store' });
        if (!response.ok) throw new Error(`No se pudo precargar la aplicación: ${response.status}`);
        const html = await response.clone().text();
        const shellAssets = Array.from(html.matchAll(/(?:src|href)="([^"]+)"/g), ([, asset]) => new URL(asset, self.location.origin))
          .filter((url) => url.origin === self.location.origin && url.pathname.startsWith('/assets/'))
          .map((url) => url.href);
        await cache.put('/', response);
        await cache.addAll([...new Set([...APP_SHELL, ...shellAssets].map((asset) => new URL(asset, self.location.origin).href))]);
      })
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((names) => Promise.all(names
        .filter((name) => name.startsWith('ciencias-ingenieria-') && name !== CACHE_NAME)
        .map((name) => caches.delete(name))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin || url.pathname.startsWith('/api/') || url.pathname.startsWith('/uploads/') || url.pathname === '/sw.js') return;

  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const response = await fetch(request, { cache: 'no-store' });
        if (response.ok) {
          const cache = await caches.open(CACHE_NAME);
          await cache.put('/', response.clone());
        }
        return response;
      } catch {
        return (await caches.match('/')) || Response.error();
      }
    })());
    return;
  }

  event.respondWith((async () => {
    const cached = await caches.match(request);
    if (cached) return cached;
    const response = await fetch(request);
    if (response.ok && CACHEABLE_DESTINATIONS.has(request.destination)) {
      const cache = await caches.open(CACHE_NAME);
      await cache.put(request, response.clone());
    }
    return response;
  })());
});
