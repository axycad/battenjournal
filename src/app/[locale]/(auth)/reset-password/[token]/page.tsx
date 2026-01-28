'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import {Link} from '@/navigation'
import { Button, Input } from '@/components/ui'
import { resetPassword } from '@/actions/auth'
import { useRouter } from '@/navigation'

export default function ResetPasswordPage({
  params,
}: {
  params: { token: string }
}) {
  const t = useTranslations('authReset')
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (password !== confirm) {
      setError(t('errorMismatch'))
      return
    }

    setLoading(true)
    try {
      const result = await resetPassword({ token: params.token, password })
      if (!result.success) {
        setError(result.error || t('errorReset'))
      } else {
        setSuccess(true)
        router.refresh()
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

      {success ? (
        <>
          <p className="text-body text-text-secondary mb-md text-center">
            {t('success')}
          </p>
          <p className="text-center text-meta text-text-secondary">
            <Link href="/login" className="text-accent-primary hover:underline">
              {t('backToSignIn')}
            </Link>
          </p>
        </>
      ) : (
        <>
          <form onSubmit={handleSubmit} className="space-y-sm">
            <Input
              label={t('newPassword')}
              type="password"
              name="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="new-password"
              minLength={8}
            />
            <Input
              label={t('confirmPassword')}
              type="password"
              name="confirmPassword"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              autoComplete="new-password"
              minLength={8}
            />

            {error && (
              <p className="text-caption text-semantic-critical">{error}</p>
            )}

            <Button type="submit" className="w-full" loading={loading}>
              {t('reset')}
            </Button>
          </form>

          <p className="mt-md text-center text-meta text-text-secondary">
            <Link href="/login" className="text-accent-primary hover:underline">
              {t('backToSignIn')}
            </Link>
          </p>
        </>
      )}
    </>
  )
}
