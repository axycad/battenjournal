'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button, Input } from '@/components/ui'
import { requestPasswordReset } from '@/actions/auth'

export default function ForgotPasswordPage() {
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
        setError(result.error || 'Unable to send reset email')
      } else {
        setSent(true)
      }
    } catch {
      setError('Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <h1 className="screen-title text-center mb-lg">Reset password</h1>

      <p className="text-body text-text-secondary mb-md">
        Enter the email you use for Batten Journal and we&apos;ll send you a reset
        link.
      </p>

      <form onSubmit={handleSubmit} className="space-y-sm">
        <Input
          label="Email"
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
            If an account exists for that email, a reset link is on the way.
          </p>
        )}

        <Button type="submit" className="w-full" loading={loading}>
          Send reset link
        </Button>
      </form>

      <p className="mt-md text-center text-meta text-text-secondary">
        <Link href="/login" className="text-accent-primary hover:underline">
          Back to sign in
        </Link>
      </p>
    </>
  )
}
