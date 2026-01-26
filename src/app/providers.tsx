'use client'

import { type ReactNode, useEffect } from 'react'
import { OfflineProvider } from '@/lib/offline'
import { OfflineBanner } from '@/components/offline'
import { useServiceWorker } from '@/lib/offline/service-worker'
import { triggerSync } from '@/lib/offline'

interface ProvidersProps {
  children: ReactNode
}

export function Providers({ children }: ProvidersProps) {
  // Register service worker
  const { isUpdateAvailable, update } = useServiceWorker()

  // Listen for sync events from service worker
  useEffect(() => {
    function handleSyncRequest() {
      triggerSync()
    }

    window.addEventListener('sync-requested', handleSyncRequest)
    return () => window.removeEventListener('sync-requested', handleSyncRequest)
  }, [])

  return (
    <OfflineProvider>
      {/* Offline banner - fixed at top when offline */}
      <OfflineBanner />

      {/* Update available notification */}
      {isUpdateAvailable && (
        <div className="fixed bottom-4 left-4 right-4 z-50 max-w-sm mx-auto p-sm bg-white border border-divider rounded-md shadow-lg">
          <p className="text-meta text-text-primary mb-sm">
            A new version is available.
          </p>
          <button
            onClick={update}
            className="text-meta text-accent-primary hover:underline"
          >
            Update now
          </button>
        </div>
      )}

      {/* Main content with top padding when offline banner is shown */}
      <div className="offline-content-wrapper">{children}</div>
    </OfflineProvider>
  )
}
