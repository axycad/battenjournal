'use client'

import { useState } from 'react'
import { Button, Input } from '@/components/ui'
import { createInviteAPI } from '@/lib/api/invites'

interface InviteFormProps {
  caseId: string
  childName: string
}

export function InviteForm({ caseId, childName }: InviteFormProps) {
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<'EDITOR' | 'VIEWER'>('EDITOR')
  const [inviteLink, setInviteLink] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setInviteLink('')
    setLoading(true)

    try {
      const result = await createInviteAPI({
        caseId,
        email,
        familyRole: role,
      })

      if (!result.success) {
        setError(result.error || 'Failed to create invite')
      } else if (result.data) {
        setInviteLink(result.data.inviteLink)
        setEmail('')
      }
    } catch {
      setError('Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  async function copyLink() {
    await navigator.clipboard.writeText(inviteLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (inviteLink) {
    return (
      <div className="space-y-sm">
        <p className="text-body">
          Share this link with your family member. It expires in 7 days.
        </p>
        <div className="flex gap-sm">
          <input
            type="text"
            value={inviteLink}
            readOnly
            className="flex-1 px-sm py-2 bg-bg-primary border border-divider rounded-sm text-meta"
          />
          <Button variant="secondary" onClick={copyLink}>
            {copied ? 'Copied' : 'Copy'}
          </Button>
        </div>
        <Button variant="text" onClick={() => setInviteLink('')} className="px-0">
          Invite another
        </Button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-sm">
      <p className="text-body text-text-secondary">
        Invite a family member to help care for {childName}.
      </p>

      <Input
        label="Email address"
        type="email"
        name="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />

      <div>
        <label className="block text-meta text-text-secondary mb-xs">
          Permission level
        </label>
        <div className="flex gap-sm">
          <button
            type="button"
            onClick={() => setRole('EDITOR')}
            className={`flex-1 px-sm py-2 border rounded-sm text-body ${
              role === 'EDITOR'
                ? 'border-accent-primary bg-accent-primary/10'
                : 'border-divider'
            }`}
          >
            Editor
            <span className="block text-caption text-text-secondary">
              Can add and edit entries
            </span>
          </button>
          <button
            type="button"
            onClick={() => setRole('VIEWER')}
            className={`flex-1 px-sm py-2 border rounded-sm text-body ${
              role === 'VIEWER'
                ? 'border-accent-primary bg-accent-primary/10'
                : 'border-divider'
            }`}
          >
            Viewer
            <span className="block text-caption text-text-secondary">
              Can view only
            </span>
          </button>
        </div>
      </div>

      {error && (
        <p className="text-caption text-semantic-critical">{error}</p>
      )}

      <Button type="submit" loading={loading}>
        Create invite
      </Button>
    </form>
  )
}
