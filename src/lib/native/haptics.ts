import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics'
import { Capacitor } from '@capacitor/core'

/**
 * Trigger haptic feedback with specified intensity
 */
export async function triggerHaptic(style: 'light' | 'medium' | 'heavy' = 'light'): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    try {
      const impactStyle = {
        light: ImpactStyle.Light,
        medium: ImpactStyle.Medium,
        heavy: ImpactStyle.Heavy,
      }[style]
      await Haptics.impact({ style: impactStyle })
    } catch (error) {
      console.error('Failed to trigger haptics:', error)
    }
  }
}

/**
 * Trigger light haptic feedback
 */
export async function hapticsLight(): Promise<void> {
  return triggerHaptic('light')
}

/**
 * Trigger medium haptic feedback
 */
export async function hapticsMedium(): Promise<void> {
  return triggerHaptic('medium')
}

/**
 * Trigger heavy haptic feedback
 */
export async function hapticsHeavy(): Promise<void> {
  return triggerHaptic('heavy')
}

/**
 * Trigger vibration for errors/warnings
 */
export async function hapticsNotification(type: 'success' | 'warning' | 'error' = 'success'): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    try {
      const notificationType = {
        success: NotificationType.Success,
        warning: NotificationType.Warning,
        error: NotificationType.Error,
      }[type]
      await Haptics.notification({ type: notificationType })
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
