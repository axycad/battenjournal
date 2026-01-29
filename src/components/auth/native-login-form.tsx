'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { NativeAuth } from '@/lib/auth-native'

/**
 * Login form for native apps
 * Uses token-based authentication instead of NextAuth
 */
export function NativeLoginForm() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      await NativeAuth.login(email, password)
      // Login successful, redirect to dashboard
      router.push('/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-md">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-md">
          <p className="text-body text-red-700">{error}</p>
        </div>
      )}

      <div>
        <label htmlFor="email" className="block text-body font-medium text-text-primary mb-xs">
          Email
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoCapitalize="none"
          autoComplete="email"
          disabled={loading}
          className="w-full px-md py-sm border-2 border-purple-200 rounded-lg focus:border-purple-600 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
        />
      </div>

      <div>
        <label htmlFor="password" className="block text-body font-medium text-text-primary mb-xs">
          Password
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="current-password"
          disabled={loading}
          className="w-full px-md py-sm border-2 border-purple-200 rounded-lg focus:border-purple-600 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full px-lg py-sm bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-md hover:shadow-lg transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? 'Logging in...' : 'Log in'}
      </button>
    </form>
  )
}
