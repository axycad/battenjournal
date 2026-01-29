'use client'

import { useState } from 'react'
import { Button, Input } from '@/components/ui'
import { createClinicianInviteAPI } from '@/lib/api/invites'

interface ClinicianInviteFormProps {
  caseId: string
  childName: string
}

export function ClinicianInviteForm({ caseId, childName }: ClinicianInviteFormProps) {
  const [email, setEmail] = useState('')
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
      const result = await createClinicianInviteAPI({ caseId, email }) as { success: boolean; error?: string; data?: { inviteLink: string } }

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
          Share this link with the clinician. They will select their specialty when accepting.
        </p>
        <p className="text-meta text-text-secondary">
          The link expires in 7 days.
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
        Invite a doctor, nurse, or therapist to view {childName}'s records.
      </p>

      <Input
        label="Clinician's email"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="doctor@nhs.net"
        required
      />

      {error && <p className="text-caption text-semantic-critical">{error}</p>}

      <Button type="submit" loading={loading}>
        Send invite
      </Button>
    </form>
  )
}
