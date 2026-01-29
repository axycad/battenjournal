import { Haptics, ImpactStyle } from '@capacitor/haptics'
import { Capacitor } from '@capacitor/core'

/**
 * Trigger light haptic feedback
 */
export async function hapticsLight(): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    try {
      await Haptics.impact({ style: ImpactStyle.Light })
    } catch (error) {
      console.error('Failed to trigger light haptics:', error)
    }
  }
}

/**
 * Trigger medium haptic feedback
 */
export async function hapticsMedium(): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    try {
      await Haptics.impact({ style: ImpactStyle.Medium })
    } catch (error) {
      console.error('Failed to trigger medium haptics:', error)
    }
  }
}

/**
 * Trigger heavy haptic feedback
 */
export async function hapticsHeavy(): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    try {
      await Haptics.impact({ style: ImpactStyle.Heavy })
    } catch (error) {
      console.error('Failed to trigger heavy haptics:', error)
    }
  }
}

/**
 * Trigger vibration for errors/warnings
 */
export async function hapticsNotification(type: 'success' | 'warning' | 'error' = 'success'): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    try {
      await Haptics.notification({ type })
    } catch (error) {
      console.error('Failed to trigger notification haptics:', error)
    }
  }
}

/**
 * Check if haptics are available
 */
export function isHapticsAvailable(): boolean {
  return Capacitor.isNativePlatform()
}
