'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import {Link} from '@/navigation'
import { Button, Input } from '@/components/ui'
import { requestPasswordReset } from '@/actions/auth'

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
      const result = await requestPasswordReset({ email })
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
    <>
      <h1 className="screen-title text-center mb-lg">{t('title')}</h1>

      <p className="text-body text-text-secondary mb-md">
        {t('description')}
      </p>

      <form onSubmit={handleSubmit} className="space-y-sm">
        <Input
          label={t('email')}
          type="email"
          name="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
        />

        {error && (
          <p className="text-caption text-semantic-critical">{error}</p>
        )}
        {sent && !error && (
          <p className="text-caption text-text-secondary">
            {t('sent')}
          </p>
        )}

        <Button type="submit" className="w-full" loading={loading}>
          {t('send')}
        </Button>
      </form>

      <p className="mt-md text-center text-meta text-text-secondary">
        <Link href="/login" className="text-accent-primary hover:underline">
          {t('backToSignIn')}
        </Link>
      </p>
    </>
  )
}
