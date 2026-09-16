// Hand-written service worker (no build plugin): precaches the static app
// shell and opportunistically caches hashed build assets as they're
// fetched, so the app works offline after the first visit. Bump
// CACHE_NAME when this caching strategy itself changes; content changes
// in hashed assets are already safe without a bump (see below).
const CACHE_NAME = 'keller-cache-v1'

// Resolved against the SW's own scope rather than hardcoded to '/', so the
// same file works whether the app is hosted at a domain root or under a
// subpath (e.g. a GitHub Pages project site).
const SCOPE_PATH = new URL(self.registration.scope).pathname
const APP_SHELL_URL = SCOPE_PATH

const PRECACHE_URLS = [
  APP_SHELL_URL,
  `${SCOPE_PATH}manifest.webmanifest`,
  `${SCOPE_PATH}favicon.svg`,
  `${SCOPE_PATH}apple-touch-icon.png`,
  `${SCOPE_PATH}icons/icon-192.png`,
  `${SCOPE_PATH}icons/icon-512.png`,
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  // Hash-based routing means every navigation loads the same index.html;
  // try the network first so updates show up, falling back to the cached
  // shell when offline.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match(APP_SHELL_URL).then((cached) => cached ?? Response.error())),
    )
    return
  }

  // Hashed build assets are immutable per build, so cache-first is safe:
  // a stale cache entry is never served for content that changed, because
  // a changed file gets a new hash (and therefore a new URL) instead.
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached
      return fetch(request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone()
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone))
          }
          return response
        })
        .catch(() => cached ?? Response.error())
    }),
  )
})
