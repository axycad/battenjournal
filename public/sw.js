/// <reference lib="webworker" />

const CACHE_NAME = 'batten-journal-v1'
const STATIC_CACHE_NAME = 'batten-journal-static-v1'

// Static assets to cache on install
const STATIC_ASSETS = [
  '/',
  '/dashboard',
  '/manifest.json',
]

// API routes to cache with network-first strategy
const API_CACHE_ROUTES = [
  '/api/sync/scopes',
]

// Install: cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS)
    })
  )
  // Activate immediately
  self.skipWaiting()
})

// Activate: clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME && key !== STATIC_CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    })
  )
  // Take control of all clients immediately
  self.clients.claim()
})

// Fetch: network-first for API, cache-first for static
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)

  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return
  }

  // Skip external requests
  if (url.origin !== self.location.origin) {
    return
  }

  // API routes: network-first
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirst(event.request))
    return
  }

  // Static assets and pages: stale-while-revalidate
  event.respondWith(staleWhileRevalidate(event.request))
})

// Network-first strategy
async function networkFirst(request) {
  try {
    const response = await fetch(request)
    
    // Cache successful responses for cacheable API routes
    if (response.ok && API_CACHE_ROUTES.some(route => request.url.includes(route))) {
      const cache = await caches.open(CACHE_NAME)
      cache.put(request, response.clone())
    }
    
    return response
  } catch (error) {
    // Network failed, try cache
    const cached = await caches.match(request)
    if (cached) {
      return cached
    }
    
    // Return offline response for API
    return new Response(
      JSON.stringify({ error: 'Offline', offline: true }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }
}

// Stale-while-revalidate strategy
async function staleWhileRevalidate(request) {
  const cache = await caches.open(STATIC_CACHE_NAME)
  const cached = await cache.match(request)
  
  // Fetch in background
  const networkPromise = fetch(request).then((response) => {
    if (response.ok) {
      cache.put(request, response.clone())
    }
    return response
  }).catch(() => null)
  
  // Return cached immediately, or wait for network
  if (cached) {
    // Trigger background update but don't wait
    networkPromise
    return cached
  }
  
  const networkResponse = await networkPromise
  if (networkResponse) {
    return networkResponse
  }
  
  // Fallback for navigation requests
  if (request.mode === 'navigate') {
    const fallback = await cache.match('/')
    if (fallback) {
      return fallback
    }
  }
  
  return new Response('Offline', { status: 503 })
}

// Handle sync events (Background Sync API)
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-outbox') {
    event.waitUntil(syncOutbox())
  }
})

async function syncOutbox() {
  // Notify clients to process outbox
  const clients = await self.clients.matchAll()
  clients.forEach((client) => {
    client.postMessage({ type: 'SYNC_REQUESTED' })
  })
}

// Handle messages from clients
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})
