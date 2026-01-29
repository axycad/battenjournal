'use client'

import { useEffect, useState } from 'react'
import { Capacitor } from '@capacitor/core'

/**
 * PWA Install Prompt - Shows "Add to Home Screen" prompt for web users
 * Not shown in native apps
 */
export function PWAPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [showPrompt, setShowPrompt] = useState(false)

  useEffect(() => {
    // Don't show in native apps
    if (Capacitor.isNativePlatform()) {
      return
    }

    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      return
    }

    // Check if user already dismissed
    const dismissed = localStorage.getItem('pwa-prompt-dismissed')
    if (dismissed) {
      const dismissedTime = parseInt(dismissed)
      const daysSinceDismissed = (Date.now() - dismissedTime) / (1000 * 60 * 60 * 24)
      if (daysSinceDismissed < 30) {
        // Don't show again for 30 days
        return
      }
    }

    // Listen for install prompt
    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e)

      // Wait a bit before showing (better UX)
      setTimeout(() => setShowPrompt(true), 3000)
    }

    window.addEventListener('beforeinstallprompt', handler)

    return () => {
      window.removeEventListener('beforeinstallprompt', handler)
    }
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt) return

    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice

    if (outcome === 'accepted') {
      console.log('PWA installed')
    }

    setDeferredPrompt(null)
    setShowPrompt(false)
  }

  const handleDismiss = () => {
    localStorage.setItem('pwa-prompt-dismissed', Date.now().toString())
    setShowPrompt(false)
  }

  if (!showPrompt) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t-2 border-purple-200 shadow-2xl p-md z-50 safe-bottom">
      <div className="max-w-3xl mx-auto flex items-start gap-md">
        <div className="flex-1">
          <h3 className="text-body font-semibold text-text-primary mb-xs">
            Install Batten Journal
          </h3>
          <p className="text-meta text-text-secondary">
            Install this app on your device for quick access and offline support.
          </p>
        </div>
        <div className="flex gap-sm">
          <button
            onClick={handleInstall}
            className="px-md py-sm bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-md hover:shadow-lg transition-all font-medium whitespace-nowrap"
          >
            Install
          </button>
          <button
            onClick={handleDismiss}
            className="px-md py-sm border-2 border-purple-200 text-text-secondary rounded-md hover:border-purple-400 hover:bg-purple-50 transition-all whitespace-nowrap"
          >
            Not now
          </button>
        </div>
      </div>
    </div>
  )
}
