// Bump CACHE when this file's strategy changes; activate deletes older caches.
const CACHE = 'sui-dhaga-v1'

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (e) => {
  const { request } = e
  const url = new URL(request.url)
  // Only same-origin GETs: Supabase (other origin) and non-GETs are never touched.
  // /t/* (public tracking) always goes to the network, never cached.
  if (request.method !== 'GET' || url.origin !== location.origin || url.pathname.startsWith('/t/')) return

  if (url.pathname.startsWith('/_next/static/') || url.pathname.startsWith('/icons/')) {
    e.respondWith(
      caches.match(request).then((hit) => hit || fetch(request).then((res) => {
        if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(request, copy)) }
        return res
      })),
    )
  } else if (request.mode === 'navigate') {
    // Only the client-rendered board shell at `/` is kept (no customer data in it); refreshed on every
    // successful visit so it never points at stale chunk hashes. Redirects (logged-out -> /login) are
    // not cached: browsers reject redirected responses for navigations.
    e.respondWith(
      fetch(request).then((res) => {
        if (url.pathname === '/' && res.ok && !res.redirected && res.type === 'basic') {
          const copy = res.clone()
          caches.open(CACHE).then((c) => c.put('/', copy))
        }
        return res
      }).catch(() => caches.match('/').then((hit) => hit || Response.error())),
    )
  }
})
