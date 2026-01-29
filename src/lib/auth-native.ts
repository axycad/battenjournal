import { Capacitor } from '@capacitor/core'
import { getStorageItem, setStorageItem, removeStorageItem } from './native/storage'

export interface NativeSession {
  user: {
    id: string
    email: string
    name: string | null
    role: string
  }
  accessToken: string
  refreshToken: string
  expiresAt: number
}

const SESSION_KEY = 'batten_native_session'
const API_URL = process.env.NEXT_PUBLIC_API_URL || ''

/**
 * Native authentication manager for Capacitor apps
 * Handles token-based authentication with secure storage
 */
export class NativeAuth {
  /**
   * Login with email and password
   */
  static async login(email: string, password: string): Promise<NativeSession> {
    const response = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Login failed')
    }

    const data = await response.json()
    const session: NativeSession = {
      user: data.user,
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
      expiresAt: data.expiresAt,
    }

    await this.saveSession(session)
    return session
  }

  /**
   * Logout and clear session
   */
  static async logout(): Promise<void> {
    await removeStorageItem(SESSION_KEY)
  }

  /**
   * Get current session
   * Automatically refreshes if expired
   */
  static async getSession(): Promise<NativeSession | null> {
    const sessionStr = await getStorageItem(SESSION_KEY)
    if (!sessionStr) return null

    try {
      const session: NativeSession = JSON.parse(sessionStr)

      // Check if token is expired or about to expire (within 5 minutes)
      const expiresIn = session.expiresAt - Date.now()
      if (expiresIn < 5 * 60 * 1000) {
        // Token expired or expiring soon, refresh it
        return await this.refreshSession(session)
      }

      return session
    } catch (error) {
      console.error('Failed to parse session:', error)
      await this.logout()
      return null
    }
  }

  /**
   * Refresh access token using refresh token
   */
  private static async refreshSession(oldSession: NativeSession): Promise<NativeSession | null> {
    try {
      const response = await fetch(`${API_URL}/api/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: oldSession.refreshToken }),
      })

      if (!response.ok) {
        // Refresh failed, logout user
        await this.logout()
        return null
      }

      const data = await response.json()
      const newSession: NativeSession = {
        user: data.user,
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        expiresAt: data.expiresAt,
      }

      await this.saveSession(newSession)
      return newSession
    } catch (error) {
      console.error('Failed to refresh session:', error)
      await this.logout()
      return null
    }
  }

  /**
   * Save session to secure storage
   */
  private static async saveSession(session: NativeSession): Promise<void> {
    await setStorageItem(SESSION_KEY, JSON.stringify(session))
  }

  /**
   * Check if running in native app
   */
  static isNativeApp(): boolean {
    return Capacitor.isNativePlatform()
  }

  /**
   * Get access token for API requests
   */
  static async getAccessToken(): Promise<string | null> {
    const session = await this.getSession()
    return session?.accessToken || null
  }
}
