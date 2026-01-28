'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import Link from 'next-intl/link'
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
    <>
      <h1 className="screen-title text-center mb-lg">{t('title')}</h1>

      <form onSubmit={handleSubmit} className="space-y-sm">
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
        <p className="text-caption text-text-secondary">{t('passwordHint')}</p>

        {error && (
          <p className="text-caption text-semantic-critical">{error}</p>
        )}

        <Button type="submit" className="w-full" loading={loading}>
          {t('createAccount')}
        </Button>
      </form>

      <p className="mt-md text-center text-meta text-text-secondary">
        {t('alreadyAccount')}{' '}
        <Link href="/login" className="text-accent-primary hover:underline">
          {t('signIn')}
        </Link>
      </p>
    </>
  )
}
