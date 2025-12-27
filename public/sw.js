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
function shouldCache(url) {
  return CACHE_PATTERNS.some(pattern => pattern.test(url))
}

// Install event - pre-cache nothing, use runtime caching
self.addEventListener('install', (event) => {
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
  const url = event.request.url

  if (!shouldCache(url)) {
    return // Let browser handle normally
  }

  event.respondWith(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.match(event.request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse
        }

        return fetch(event.request).then((networkResponse) => {
          if (networkResponse.ok) {
            cache.put(event.request, networkResponse.clone())
          }
          return networkResponse
        })
      })
    })
  )
})
