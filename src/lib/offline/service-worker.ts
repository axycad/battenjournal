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

    // Service worker disabled - PWA functionality removed
    // Offline support still works via IndexedDB (Dexie)
    setIsSupported(false)
    setIsRegistered(false)

    // Unregister any existing service workers from previous PWA setup
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      registrations.forEach((registration) => registration.unregister())
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
