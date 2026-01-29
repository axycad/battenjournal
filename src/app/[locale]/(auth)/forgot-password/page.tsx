'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import {Link} from '@/navigation'
import { Button, Input } from '@/components/ui'
import { requestPasswordResetAPI } from '@/lib/api'

export default function ForgotPasswordPage() {
  const t = useTranslations('authForgot')
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const result = await requestPasswordResetAPI({ email })
      if (!result.success) {
        setError(result.error || t('errorSend'))
      } else {
        setSent(true)
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
          Reset your password
        </h1>
        <p className="text-body text-text-secondary">
          {t('description')}
        </p>
      </div>

      {/* Success message */}
      {sent && !error && (
        <div className="p-md bg-green-50 border border-green-200 rounded-md">
          <div className="flex gap-sm">
            <span className="text-xl">✓</span>
            <div>
              <p className="text-body font-medium text-green-800 mb-xs">
                Check your email
              </p>
              <p className="text-meta text-green-700">
                {t('sent')}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Form */}
      {!sent && (
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
            {t('send')}
          </Button>
        </form>
      )}

      {/* Back to login */}
      <div className="text-center pt-md">
        <Link
          href="/login"
          className="text-meta text-purple-600 hover:text-purple-700 hover:underline"
        >
          ← {t('backToSignIn')}
        </Link>
      </div>
    </div>
  )
}
