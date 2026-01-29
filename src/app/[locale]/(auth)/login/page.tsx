'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import {Link} from '@/navigation'
import { signIn } from 'next-auth/react'
import { Button, Input } from '@/components/ui'
import { useRouter } from '@/navigation'

export default function LoginPage() {
  const t = useTranslations('authLogin')
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      })

      if (result?.error) {
        setError(t('errorInvalidCredentials'))
      } else {
        router.push('/dashboard')
        router.refresh()
      }
    } catch {
      setError(t('errorGeneric'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-md">
      {/* Header */}
      <div className="text-center mb-lg">
        <h1 className="text-h2 font-bold text-text-primary mb-xs">
          Welcome back
        </h1>
        <p className="text-body text-text-secondary">
          Sign in to continue your journal
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-md">
        <Input
          label={t('email')}
          type="email"
          name="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
          autoFocus
        />

        <Input
          label={t('password')}
          type="password"
          name="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="current-password"
        />

        <div className="flex justify-end">
          <Link
            href="/forgot-password"
            className="text-meta text-purple-600 hover:text-purple-700 hover:underline"
          >
            {t('forgotPassword')}
          </Link>
        </div>

        {error && (
          <div className="p-sm bg-red-50 border border-red-200 rounded-md">
            <p className="text-meta text-red-700">{error}</p>
          </div>
        )}

        <Button
          type="submit"
          className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:shadow-lg"
          loading={loading}
        >
          {t('signIn')}
        </Button>
      </form>

      {/* Register link - subtle */}
      <div className="text-center pt-md">
        <p className="text-meta text-text-secondary">
          New to Batten Journal?{' '}
          <Link
            href="/register"
            className="text-purple-600 hover:text-purple-700 hover:underline font-medium"
          >
            {t('register')}
          </Link>
        </p>
      </div>
    </div>
  )
}
