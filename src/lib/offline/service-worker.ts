'use client'

import { useEffect, useState } from 'react'

interface ServiceWorkerState {
  isSupported: boolean
  isRegistered: boolean
  isUpdateAvailable: boolean
  update: () => void
}

export function useServiceWorker(): ServiceWorkerState {
  const [isSupported, setIsSupported] = useState(false)
  const [isRegistered, setIsRegistered] = useState(false)
  const [isUpdateAvailable, setIsUpdateAvailable] = useState(false)
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return
    }

    setIsSupported(true)

    // Register service worker
    navigator.serviceWorker
      .register('/sw.js')
      .then((reg) => {
        setRegistration(reg)
        setIsRegistered(true)

        // Check for updates
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                setIsUpdateAvailable(true)
              }
            })
          }
        })
      })
      .catch((error) => {
        console.error('Service worker registration failed:', error)
      })

    // Listen for controller change (update applied)
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      window.location.reload()
    })

    // Listen for sync messages
    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data?.type === 'SYNC_REQUESTED') {
        // Trigger sync from the offline module
        window.dispatchEvent(new CustomEvent('sync-requested'))
      }
    })
  }, [])

  function update() {
    if (registration?.waiting) {
      registration.waiting.postMessage({ type: 'SKIP_WAITING' })
    }
  }

  return {
    isSupported,
    isRegistered,
    isUpdateAvailable,
    update,
  }
}
