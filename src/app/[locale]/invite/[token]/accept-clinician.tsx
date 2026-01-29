'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui'
import { acceptClinicianInviteAPI } from '@/lib/api/invites'
import { SPECIALTIES, type Specialty } from '@/lib/specialties'

interface AcceptClinicianInviteProps {
  token: string
}

export function AcceptClinicianInvite({ token }: AcceptClinicianInviteProps) {
  const router = useRouter()
  const [specialty, setSpecialty] = useState<Specialty | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleAccept() {
    if (!specialty) {
      setError('Please select your specialty')
      return
    }

    setLoading(true)
    setError('')

    const result = await acceptClinicianInviteAPI(token, specialty)

    if (!result.success) {
      setError(result.error || 'Failed to accept invite')
      setLoading(false)
      return
    }

    router.push(`/case/${result.data?.caseId}`)
  }

  return (
    <div className="space-y-md">
      <div>
        <p className="text-meta text-text-secondary mb-sm">
          Select your specialty to set default viewing permissions:
        </p>
        <div className="space-y-xs">
          {(Object.entries(SPECIALTIES) as [Specialty, typeof SPECIALTIES[Specialty]][]).map(
            ([key, config]) => (
              <button
                key={key}
                onClick={() => setSpecialty(key)}
                className={`w-full p-sm text-left border rounded-sm transition-colors ${
                  specialty === key
                    ? 'border-accent-primary bg-accent-primary/10'
                    : 'border-divider hover:border-accent-primary'
                }`}
              >
                <span className="text-body">{config.label}</span>
                <span className="block text-caption text-text-secondary mt-xs">
                  {config.defaultScopes.length} categories
                </span>
              </button>
            )
          )}
        </div>
      </div>

      <p className="text-meta text-text-secondary">
        The family can adjust your access at any time.
      </p>

      {error && <p className="text-caption text-semantic-critical">{error}</p>}

      <Button
        onClick={handleAccept}
        loading={loading}
        disabled={!specialty}
        className="w-full"
      >
        Accept and continue
      </Button>
    </div>
  )
}
