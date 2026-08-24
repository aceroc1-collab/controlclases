const CACHE = 'clases-v1'
const BASICOS = ['/', '/index.html', '/manifest.webmanifest', '/icon-192.png', '/icon-512.png']

self.addEventListener('install', (evento) => {
  evento.waitUntil(
    caches
      .open(CACHE)
      .then((c) => c.addAll(BASICOS))
      .catch(() => null)
      .then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', (evento) => {
  evento.waitUntil(
    caches
      .keys()
      .then((claves) => Promise.all(claves.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (evento) => {
  const req = evento.request
  if (req.method !== 'GET') return

  const url = new URL(req.url)
  const mismoOrigen = url.origin === self.location.origin

  // Navegación: intenta la red y cae al cache si no hay señal en la cancha.
  if (req.mode === 'navigate') {
    evento.respondWith(
      fetch(req)
        .then((res) => {
          const copia = res.clone()
          caches.open(CACHE).then((c) => c.put('/index.html', copia))
          return res
        })
        .catch(() => caches.match('/index.html').then((r) => r || caches.match('/')))
    )
    return
  }

  // Recursos: primero el cache, y si no está se busca y se guarda.
  evento.respondWith(
    caches.match(req).then((guardado) => {
      if (guardado) return guardado
      return fetch(req)
        .then((res) => {
          if ((mismoOrigen || url.hostname.includes('fonts.')) && res.status === 200) {
            const copia = res.clone()
            caches.open(CACHE).then((c) => c.put(req, copia))
          }
          return res
        })
        .catch(() => guardado)
    })
  )
})
