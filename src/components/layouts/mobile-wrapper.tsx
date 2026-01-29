'use client'

import { useEffect, type ReactNode } from 'react'
import { Capacitor } from '@capacitor/core'
import { StatusBar, Style } from '@capacitor/status-bar'
import { Keyboard } from '@capacitor/keyboard'

interface MobileWrapperProps {
  children: ReactNode
}

/**
 * MobileWrapper - Handles native mobile platform optimizations
 *
 * Features:
 * - Sets status bar style for iOS/Android
 * - Adds safe area padding for notches and home indicators
 * - Configures keyboard behavior
 * - Only applies native features when running in Capacitor
 */
export function MobileWrapper({ children }: MobileWrapperProps) {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) {
      return
    }

    // Configure status bar for native apps
    async function setupNativeFeatures() {
      try {
        // Set status bar style (light text on dark background)
        await StatusBar.setStyle({ style: Style.Light })

        // Set status bar background color to match app header
        await StatusBar.setBackgroundColor({ color: '#5F7486' }) // accent-primary

        // Configure keyboard behavior
        await Keyboard.setAccessoryBarVisible({ isVisible: false })
        await Keyboard.setScroll({ isDisabled: false })
      } catch (error) {
        console.error('Failed to setup native features:', error)
      }
    }

    setupNativeFeatures()
  }, [])

  return (
    <div className="min-h-screen pt-safe-top pb-safe-bottom">
      {children}
    </div>
  )
}
