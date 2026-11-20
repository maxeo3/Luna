// Service worker di Luna: rende l'app utilizzabile offline.
// Quando modifichi i file dell'app, aumenta CACHE_VERSION per forzare l'aggiornamento.
const CACHE_VERSION = 'luna-v1';
const PRECACHE = [
  './',
  'index.html',
  'manifest.json',
  'icon.svg',
  'icon.png',
  'icon-192.png',
  'icon-512.png',
  'icon-maskable-512.png',
  'vendor/fontawesome/css/fontawesome.min.css',
  'vendor/fontawesome/css/solid.min.css',
  'vendor/fontawesome/webfonts/fa-solid-900.woff2'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;

  // Pagina: prima la rete (così gli aggiornamenti arrivano subito), poi la copia salvata se sei offline
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put('index.html', copy));
          return res;
        })
        .catch(() => caches.match('index.html').then((r) => r || caches.match('./')))
    );
    return;
  }

  // Altri file (icone, font, css): copia salvata subito, aggiornata in background
  event.respondWith(
    caches.match(req).then((cached) => {
      const network = fetch(req)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE_VERSION).then((cache) => cache.put(req, copy));
          }
          return res;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
