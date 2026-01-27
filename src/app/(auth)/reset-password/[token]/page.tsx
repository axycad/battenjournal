'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button, Input } from '@/components/ui'
import { resetPassword } from '@/actions/auth'

export default function ResetPasswordPage({
  params,
}: {
  params: { token: string }
}) {
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
      setError('Passwords do not match')
      return
    }

    setLoading(true)
    try {
      const result = await resetPassword({ token: params.token, password })
      if (!result.success) {
        setError(result.error || 'Unable to reset password')
      } else {
        setSuccess(true)
        router.refresh()
      }
    } catch {
      setError('Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <h1 className="screen-title text-center mb-lg">Choose a new password</h1>

      {success ? (
        <>
          <p className="text-body text-text-secondary mb-md text-center">
            Your password has been updated. You can sign in now.
          </p>
          <p className="text-center text-meta text-text-secondary">
            <Link href="/login" className="text-accent-primary hover:underline">
              Back to sign in
            </Link>
          </p>
        </>
      ) : (
        <>
          <form onSubmit={handleSubmit} className="space-y-sm">
            <Input
              label="New password"
              type="password"
              name="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="new-password"
              minLength={8}
            />
            <Input
              label="Confirm new password"
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
              Reset password
            </Button>
          </form>

          <p className="mt-md text-center text-meta text-text-secondary">
            <Link href="/login" className="text-accent-primary hover:underline">
              Back to sign in
            </Link>
          </p>
        </>
      )}
    </>
  )
}
