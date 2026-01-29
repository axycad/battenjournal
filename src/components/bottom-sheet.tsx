'use client'

import { useEffect, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Capacitor } from '@capacitor/core'
import { triggerHaptic } from '@/lib/native'

interface BottomSheetProps {
  isOpen: boolean
  onClose: () => void
  children: ReactNode
  title?: string
  snapPoints?: number[] // Heights as percentages: [50, 90]
}

/**
 * BottomSheet - Mobile-native bottom sheet component
 *
 * Features:
 * - Slides up from bottom on mobile
 * - Drag-to-dismiss gesture
 * - Snap points for different heights
 * - Falls back to centered modal on desktop
 * - Backdrop with haptic feedback
 */
export function BottomSheet({
  isOpen,
  onClose,
  children,
  title,
  snapPoints = [90],
}: BottomSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null)
  const startY = useRef(0)
  const currentY = useRef(0)
  const isDragging = useRef(false)

  const isNative = Capacitor.isNativePlatform()
  const maxHeight = Math.max(...snapPoints)

  // Prevent body scroll when sheet is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
      triggerHaptic('light')
    } else {
      document.body.style.overflow = ''
    }

    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  // Handle backdrop click
  const handleBackdropClick = async (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      await triggerHaptic('light')
      onClose()
    }
  }

  // Drag handlers for mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    if (!isNative) return
    startY.current = e.touches[0].clientY
    currentY.current = startY.current
    isDragging.current = true
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging.current || !isNative) return

    currentY.current = e.touches[0].clientY
    const deltaY = currentY.current - startY.current

    // Only allow dragging down
    if (deltaY > 0 && sheetRef.current) {
      sheetRef.current.style.transform = `translateY(${deltaY}px)`
    }
  }

  const handleTouchEnd = async () => {
    if (!isDragging.current || !isNative) return

    const deltaY = currentY.current - startY.current
    const threshold = 100 // Distance to trigger close

    if (sheetRef.current) {
      if (deltaY > threshold) {
        // Close sheet
        await triggerHaptic('medium')
        onClose()
      } else {
        // Snap back
        await triggerHaptic('light')
        sheetRef.current.style.transform = 'translateY(0)'
      }
    }

    isDragging.current = false
  }

  if (!isOpen) return null

  const sheet = (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center sm:justify-center"
      onClick={handleBackdropClick}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      {/* Sheet */}
      <div
        ref={sheetRef}
        className="relative w-full bg-white rounded-t-2xl sm:rounded-2xl sm:max-w-lg transition-transform"
        style={{
          maxHeight: `${maxHeight}vh`,
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Drag handle (mobile only) */}
        {isNative && (
          <div className="flex justify-center py-xs touch-target">
            <div className="w-12 h-1 bg-divider rounded-full" />
          </div>
        )}

        {/* Header */}
        {title && (
          <div className="flex items-center justify-between px-md py-sm border-b border-divider">
            <h2 className="text-title-md font-medium text-text-primary">
              {title}
            </h2>
            <button
              onClick={onClose}
              className="touch-target flex items-center justify-center"
              aria-label="Close"
            >
              <svg
                className="w-6 h-6 text-text-secondary"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        )}

        {/* Content */}
        <div className="overflow-y-auto pb-safe-bottom" style={{ maxHeight: `${maxHeight - 15}vh` }}>
          {children}
        </div>
      </div>
    </div>
  )

  // Render in portal for proper z-index stacking
  return createPortal(sheet, document.body)
}
