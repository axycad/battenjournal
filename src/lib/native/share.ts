import { Share } from '@capacitor/share'
import { Capacitor } from '@capacitor/core'

/**
 * Share text content using native share sheet
 * Falls back to Web Share API or clipboard on web
 */
export async function shareText(text: string, title?: string): Promise<boolean> {
  if (Capacitor.isNativePlatform() || ('share' in navigator)) {
    try {
      await Share.share({
        title: title || 'Share',
        text,
        dialogTitle: title || 'Share',
      })
      return true
    } catch (error) {
      console.error('Failed to share text:', error)
      return false
    }
  } else {
    // Fallback to clipboard
    try {
      await navigator.clipboard.writeText(text)
      return true
    } catch (error) {
      console.error('Failed to copy to clipboard:', error)
      return false
    }
  }
}

/**
 * Share a URL using native share sheet
 */
export async function shareUrl(url: string, title?: string, text?: string): Promise<boolean> {
  if (Capacitor.isNativePlatform() || ('share' in navigator)) {
    try {
      await Share.share({
        title: title || 'Share',
        text: text || '',
        url,
        dialogTitle: title || 'Share',
      })
      return true
    } catch (error) {
      console.error('Failed to share URL:', error)
      return false
    }
  } else {
    // Fallback to clipboard
    try {
      await navigator.clipboard.writeText(url)
      return true
    } catch (error) {
      console.error('Failed to copy URL to clipboard:', error)
      return false
    }
  }
}

/**
 * Check if native sharing is available
 */
export function canShare(): boolean {
  return Capacitor.isNativePlatform() || ('share' in navigator)
}
