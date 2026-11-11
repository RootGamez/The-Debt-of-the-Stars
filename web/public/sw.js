// Service worker mínimo: hace el juego instalable y lo deja abrir sin conexión una vez visitado.
// HTML: red primero (siempre la versión nueva), caché si no hay red. Resto (con hash, audio, letras): caché primero.
const CACHE = 'deuda-estrellas-v1';

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== self.location.origin || req.headers.has('range'))
    return;

  const store = (res) => {
    if (res.ok) {
      const copy = res.clone();
      caches.open(CACHE).then((c) => c.put(req, copy));
    }
    return res;
  };

  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then(store)
        .catch(() => caches.match(req).then((hit) => hit || caches.match('./'))),
    );
    return;
  }

  event.respondWith(caches.match(req).then((hit) => hit || fetch(req).then(store)));
});
