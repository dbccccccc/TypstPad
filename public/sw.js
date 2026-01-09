// Service Worker for TypstPad - Caches WASM and font files
const CACHE_NAME = 'typstpad-v1'

// Resources to cache (large files that benefit most from caching)
const CACHE_PATTERNS = [
  /\.wasm$/,
  /\.otf$/,
  /\.ttf$/,
  /\.woff2?$/,
]

// Check if URL should be cached
function shouldCache(pathname) {
  // Don't cache version.json to ensure fresh version checks
  if (pathname.includes('version.json')) return false
  return CACHE_PATTERNS.some(pattern => pattern.test(pathname))
}

// Install event - pre-cache nothing, use runtime caching
self.addEventListener('install', () => {
  self.skipWaiting()
})

// Activate event - clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      )
    }).then(() => self.clients.claim())
  )
})

// Fetch event - cache-first strategy for large assets
self.addEventListener('fetch', (event) => {
  const request = event.request

  // Security: only handle GET requests
  if (request.method !== 'GET') {
    return
  }

  const requestUrl = new URL(request.url)

  // Security: only handle same-origin requests
  if (requestUrl.origin !== self.location.origin) {
    return
  }

  if (!shouldCache(requestUrl.pathname)) {
    return // Let browser handle normally
  }

  event.respondWith(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse
        }

        return fetch(request).then((networkResponse) => {
          if (networkResponse.ok && networkResponse.status === 200) {
            cache.put(request, networkResponse.clone())
          }
          return networkResponse
        })
      })
    })
  )
})
