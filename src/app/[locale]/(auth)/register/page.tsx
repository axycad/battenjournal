'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import {Link} from '@/navigation'
import { signIn } from 'next-auth/react'
import { Button, Input } from '@/components/ui'
import { register } from '@/actions/auth'
import { useRouter } from '@/navigation'

export default function RegisterPage() {
  const t = useTranslations('authRegister')
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const result = await register({ name, email, password })

      if (!result.success) {
        setError(result.error || t('errorRegistrationFailed'))
        setLoading(false)
        return
      }

      // Auto-login after registration
      const signInResult = await signIn('credentials', {
        email,
        password,
        redirect: false,
      })

      if (signInResult?.error) {
        // Registration succeeded but login failed, redirect to login
        router.push('/login')
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
          Create your account
        </h1>
        <p className="text-body text-text-secondary">
          Start tracking and sharing care with your team
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-md">
        <Input
          label={t('name')}
          type="text"
          name="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          autoComplete="name"
          autoFocus
        />

        <Input
          label={t('email')}
          type="email"
          name="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
        />

        <div>
          <Input
            label={t('password')}
            type="password"
            name="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="new-password"
            minLength={8}
          />
          <p className="text-caption text-text-secondary mt-xs">
            {t('passwordHint')}
          </p>
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
          {t('createAccount')}
        </Button>
      </form>

      {/* Trust indicators */}
      <div className="bg-purple-50 rounded-md p-sm border border-purple-100">
        <p className="text-caption text-text-secondary text-center">
          🔒 Free forever • No credit card required • GDPR compliant
        </p>
      </div>

      {/* Divider */}
      <div className="relative my-lg">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-divider"></div>
        </div>
        <div className="relative flex justify-center text-meta">
          <span className="px-sm bg-white text-text-secondary">
            Already have an account?
          </span>
        </div>
      </div>

      {/* Login link */}
      <div className="text-center">
        <Link
          href="/login"
          className="inline-block w-full px-lg py-sm border-2 border-purple-200 text-purple-700 rounded-md hover:border-purple-400 hover:bg-purple-50 transition-all text-body font-medium"
        >
          {t('signIn')}
        </Link>
      </div>
    </div>
  )
}
