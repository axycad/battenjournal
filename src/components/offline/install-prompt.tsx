'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isInstalled, setIsInstalled] = useState(false)
  const [isIOS, setIsIOS] = useState(false)

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true)
      return
    }

    // Check if iOS
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent)
    setIsIOS(isIOSDevice)

    // Listen for install prompt
    function handleBeforeInstallPrompt(e: Event) {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    }
  }, [])

  async function handleInstall() {
    if (!deferredPrompt) return

    await deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice

    if (outcome === 'accepted') {
      setIsInstalled(true)
    }

    setDeferredPrompt(null)
  }

  if (isInstalled) {
    return (
      <div className="p-md bg-white border border-divider rounded-md">
        <h3 className="text-body font-medium mb-xs">App installed</h3>
        <p className="text-meta text-text-secondary">
          Batten Journal is installed on your device.
        </p>
      </div>
    )
  }

  if (isIOS) {
    return (
      <div className="p-md bg-white border border-divider rounded-md">
        <h3 className="text-body font-medium mb-xs">Install Batten Journal</h3>
        <p className="text-meta text-text-secondary mb-sm">
          Add this app to your home screen for quick access and offline support.
        </p>
        <ol className="text-meta text-text-secondary space-y-xs">
          <li>1. Tap the Share button in Safari</li>
          <li>2. Scroll down and tap "Add to Home Screen"</li>
          <li>3. Tap "Add" to confirm</li>
        </ol>
      </div>
    )
  }

  if (!deferredPrompt) {
    return null
  }

  return (
    <div className="p-md bg-white border border-divider rounded-md">
      <h3 className="text-body font-medium mb-xs">Install Batten Journal</h3>
      <p className="text-meta text-text-secondary mb-sm">
        Add this app to your home screen for quick access and offline support.
      </p>
      <Button onClick={handleInstall} className="h-auto py-2">
        Install app
      </Button>
    </div>
  )
}
