'use client'

import { useCallback } from 'react'
import { triggerHaptic } from '@/lib/native'

type ImpactStyle = 'light' | 'medium' | 'heavy'

interface UseMobileInteractionOptions {
  haptic?: boolean
  hapticStyle?: ImpactStyle
}

/**
 * Hook for mobile-optimized interactions with haptic feedback
 *
 * Example:
 * ```tsx
 * const handleClick = useMobileInteraction(() => {
 *   // Your click handler logic
 * }, { haptic: true, hapticStyle: 'light' })
 *
 * <button onClick={handleClick}>Click me</button>
 * ```
 */
export function useMobileInteraction<T extends (...args: any[]) => any>(
  callback: T,
  options: UseMobileInteractionOptions = {}
): T {
  const { haptic = false, hapticStyle = 'light' } = options

  const wrappedCallback = useCallback(
    async (...args: Parameters<T>) => {
      // Trigger haptic feedback if enabled
      if (haptic) {
        await triggerHaptic(hapticStyle)
      }

      // Execute the original callback
      return callback(...args)
    },
    [callback, haptic, hapticStyle]
  ) as T

  return wrappedCallback
}

/**
 * Specific variants for common interaction patterns
 */
export function useButtonClick<T extends (...args: any[]) => any>(
  callback: T
): T {
  return useMobileInteraction(callback, { haptic: true, hapticStyle: 'light' })
}

export function useDeleteAction<T extends (...args: any[]) => any>(
  callback: T
): T {
  return useMobileInteraction(callback, { haptic: true, hapticStyle: 'medium' })
}

export function useSubmitAction<T extends (...args: any[]) => any>(
  callback: T
): T {
  return useMobileInteraction(callback, { haptic: true, hapticStyle: 'heavy' })
}
