'use client'

import { SessionProvider } from 'next-auth/react'
import { OfflineProvider } from '@/lib/offline/context'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <OfflineProvider>{children}</OfflineProvider>
    </SessionProvider>
  )
}
