import { Preferences } from '@capacitor/preferences'
import { Capacitor } from '@capacitor/core'

/**
 * Store a value in native secure storage (Keychain on iOS, EncryptedSharedPreferences on Android)
 * Falls back to localStorage on web
 */
export async function setStorageItem(key: string, value: string): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    await Preferences.set({ key, value })
  } else {
    // Web fallback
    try {
      localStorage.setItem(key, value)
    } catch (error) {
      console.error('Failed to set storage item:', error)
    }
  }
}

/**
 * Get a value from native secure storage
 * Falls back to localStorage on web
 */
export async function getStorageItem(key: string): Promise<string | null> {
  if (Capacitor.isNativePlatform()) {
    const { value } = await Preferences.get({ key })
    return value
  } else {
    // Web fallback
    try {
      return localStorage.getItem(key)
    } catch (error) {
      console.error('Failed to get storage item:', error)
      return null
    }
  }
}

/**
 * Remove a value from native secure storage
 */
export async function removeStorageItem(key: string): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    await Preferences.remove({ key })
  } else {
    // Web fallback
    try {
      localStorage.removeItem(key)
    } catch (error) {
      console.error('Failed to remove storage item:', error)
    }
  }
}

/**
 * Clear all storage
 */
export async function clearStorage(): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    await Preferences.clear()
  } else {
    // Web fallback
    try {
      localStorage.clear()
    } catch (error) {
      console.error('Failed to clear storage:', error)
    }
  }
}

/**
 * Get all keys from storage
 */
export async function getStorageKeys(): Promise<string[]> {
  if (Capacitor.isNativePlatform()) {
    const { keys } = await Preferences.keys()
    return keys
  } else {
    // Web fallback
    try {
      return Object.keys(localStorage)
    } catch (error) {
      console.error('Failed to get storage keys:', error)
      return []
    }
  }
}
