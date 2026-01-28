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
      <h1 className="text-h2 font-bold text-text-primary text-center mb-lg">{t('title')}</h1>

      {success ? (
        <>
          <div className="p-md bg-green-50 border border-green-200 rounded-md mb-md">
            <div className="flex gap-sm items-center justify-center">
              <span className="text-xl">✓</span>
              <p className="text-body font-medium text-green-800">
                {t('success')}
              </p>
            </div>
          </div>
          <p className="text-center text-meta text-text-secondary">
            <Link href="/login" className="text-purple-600 hover:text-purple-700 hover:underline font-medium">
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
              <div className="p-sm bg-red-50 border border-red-200 rounded-md">
                <p className="text-meta text-red-700">{error}</p>
              </div>
            )}

            <Button type="submit" className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:shadow-lg" loading={loading}>
              {t('reset')}
            </Button>
          </form>

          <p className="mt-md text-center text-meta text-text-secondary">
            <Link href="/login" className="text-purple-600 hover:text-purple-700 hover:underline font-medium">
              {t('backToSignIn')}
            </Link>
          </p>
        </>
      )}
    </>
  )
}
