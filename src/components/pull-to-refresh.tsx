'use client'

import { useState, useRef, type ReactNode } from 'react'
import { Capacitor } from '@capacitor/core'
import { triggerHaptic } from '@/lib/native'

interface PullToRefreshProps {
  onRefresh: () => Promise<void>
  children: ReactNode
  disabled?: boolean
}

/**
 * PullToRefresh - Native pull-to-refresh gesture
 *
 * Features:
 * - Only active on mobile devices
 * - Haptic feedback on refresh trigger
 * - Visual indicator during pull
 * - Prevents refresh when scrolled down
 */
export function PullToRefresh({
  onRefresh,
  children,
  disabled = false,
}: PullToRefreshProps) {
  const [isPulling, setIsPulling] = useState(false)
  const [pullDistance, setPullDistance] = useState(0)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const startY = useRef(0)
  const containerRef = useRef<HTMLDivElement>(null)

  // Only enable on native mobile platforms
  const isNative = Capacitor.isNativePlatform()
  const PULL_THRESHOLD = 80 // Distance needed to trigger refresh
  const MAX_PULL = 120 // Maximum visual pull distance

  const handleTouchStart = (e: React.TouchEvent) => {
    if (disabled || !isNative || isRefreshing) return

    // Only start pull if at top of scroll
    const container = containerRef.current
    if (container && container.scrollTop === 0) {
      startY.current = e.touches[0].clientY
      setIsPulling(true)
    }
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isPulling || disabled || isRefreshing) return

    const currentY = e.touches[0].clientY
    const distance = currentY - startY.current

    // Only allow pulling down (positive distance)
    if (distance > 0) {
      // Apply rubber band effect
      const adjustedDistance = Math.min(distance * 0.5, MAX_PULL)
      setPullDistance(adjustedDistance)

      // Trigger haptic at threshold
      if (adjustedDistance >= PULL_THRESHOLD && pullDistance < PULL_THRESHOLD) {
        triggerHaptic('medium')
      }
    }
  }

  const handleTouchEnd = async () => {
    if (!isPulling || disabled) return

    setIsPulling(false)

    // Trigger refresh if pulled beyond threshold
    if (pullDistance >= PULL_THRESHOLD && !isRefreshing) {
      setIsRefreshing(true)
      await triggerHaptic('heavy')

      try {
        await onRefresh()
      } catch (error) {
        console.error('Refresh failed:', error)
      } finally {
        setIsRefreshing(false)
      }
    }

    setPullDistance(0)
  }

  // Calculate opacity for pull indicator
  const indicatorOpacity = Math.min(pullDistance / PULL_THRESHOLD, 1)
  const shouldShowIndicator = isPulling || isRefreshing

  return (
    <div
      ref={containerRef}
      className="relative overflow-auto h-full"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull indicator */}
      {isNative && shouldShowIndicator && (
        <div
          className="absolute top-0 left-0 right-0 flex items-center justify-center transition-all"
          style={{
            height: `${pullDistance}px`,
            opacity: indicatorOpacity,
          }}
        >
          <div
            className={`transition-transform ${
              isRefreshing ? 'animate-spin' : ''
            }`}
          >
            <svg
              className="w-6 h-6 text-accent-primary"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          </div>
        </div>
      )}

      {/* Content */}
      <div
        className="transition-transform"
        style={{
          transform: isPulling ? `translateY(${pullDistance}px)` : 'translateY(0)',
        }}
      >
        {children}
      </div>
    </div>
  )
}
