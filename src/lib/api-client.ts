import { getSession } from 'next-auth/react'
import { Capacitor } from '@capacitor/core'
import { NativeAuth } from './auth-native'

interface RequestOptions extends RequestInit {
  requireAuth?: boolean
}

class ApiError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

export class ApiClient {
  private baseUrl: string

  constructor() {
    // In native apps, this will be the production URL
    // In web, it's relative (empty string)
    this.baseUrl = process.env.NEXT_PUBLIC_API_URL || ''
  }

  async request<T>(
    endpoint: string,
    options: RequestOptions = {}
  ): Promise<T> {
    const { requireAuth = true, ...fetchOptions } = options

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(fetchOptions.headers as Record<string, string>),
    }

    // Get auth token based on platform
    if (requireAuth && typeof window !== 'undefined') {
      if (Capacitor.isNativePlatform()) {
        // Native app: use token-based auth
        const accessToken = await NativeAuth.getAccessToken()
        if (accessToken) {
          headers['Authorization'] = `Bearer ${accessToken}`
        }
      } else {
        // Web app: use NextAuth session
        const session = await getSession()
        if ((session as any)?.accessToken) {
          headers['Authorization'] = `Bearer ${(session as any).accessToken}`
        }
      }
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...fetchOptions,
      headers,
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new ApiError(
        response.status,
        errorText || `API Error: ${response.status}`
      )
    }

    return response.json()
  }

  // Convenience methods
  get<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'GET' })
  }

  post<T>(endpoint: string, data?: any, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    })
  }

  put<T>(endpoint: string, data?: any, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    })
  }

  patch<T>(endpoint: string, data?: any, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    })
  }

  delete<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' })
  }
}

// Export singleton instance
export const apiClient = new ApiClient()

// Export error class for error handling
export { ApiError }
