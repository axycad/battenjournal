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
    <>
      <h1 className="screen-title text-center mb-lg">{t('title')}</h1>

      <form onSubmit={handleSubmit} className="space-y-sm">
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
            className="text-meta text-accent-primary hover:underline"
          >
            {t('forgotPassword')}
          </Link>
        </div>

        {error && (
          <p className="text-caption text-semantic-critical">{error}</p>
        )}

        <Button type="submit" className="w-full" loading={loading}>
          {t('signIn')}
        </Button>
      </form>

      <p className="mt-md text-center text-meta text-text-secondary">
        {t('noAccount')}{' '}
        <Link href="/register" className="text-accent-primary hover:underline">
          {t('register')}
        </Link>
      </p>
    </>
  )
}
