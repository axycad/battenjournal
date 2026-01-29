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
  const [role, setRole] = useState<'PARENT' | 'SIBLING' | 'GRANDPARENT' | 'OTHER_FAMILY'>('PARENT')
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
      }) as { success: boolean; error?: string; data?: { inviteLink: string } }

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
          Relationship
        </label>
        <div className="grid grid-cols-2 gap-sm">
          <button
            type="button"
            onClick={() => setRole('PARENT')}
            className={`px-sm py-2 border rounded-sm text-body ${
              role === 'PARENT'
                ? 'border-accent-primary bg-accent-primary/10'
                : 'border-divider'
            }`}
          >
            Parent
          </button>
          <button
            type="button"
            onClick={() => setRole('SIBLING')}
            className={`px-sm py-2 border rounded-sm text-body ${
              role === 'SIBLING'
                ? 'border-accent-primary bg-accent-primary/10'
                : 'border-divider'
            }`}
          >
            Sibling
          </button>
          <button
            type="button"
            onClick={() => setRole('GRANDPARENT')}
            className={`px-sm py-2 border rounded-sm text-body ${
              role === 'GRANDPARENT'
                ? 'border-accent-primary bg-accent-primary/10'
                : 'border-divider'
            }`}
          >
            Grandparent
          </button>
          <button
            type="button"
            onClick={() => setRole('OTHER_FAMILY')}
            className={`px-sm py-2 border rounded-sm text-body ${
              role === 'OTHER_FAMILY'
                ? 'border-accent-primary bg-accent-primary/10'
                : 'border-divider'
            }`}
          >
            Other Family
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
