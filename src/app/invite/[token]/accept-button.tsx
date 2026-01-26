'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui'
import { acceptInvite } from '@/actions/invite'

interface AcceptInviteButtonProps {
  token: string
}

export function AcceptInviteButton({ token }: AcceptInviteButtonProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleAccept() {
    setLoading(true)
    setError('')

    const result = await acceptInvite(token)

    if (!result.success) {
      setError(result.error || 'Failed to accept invite')
      setLoading(false)
      return
    }

    router.push(`/case/${result.data?.caseId}`)
  }

  return (
    <div>
      <Button onClick={handleAccept} loading={loading} className="w-full">
        Accept invite
      </Button>
      {error && (
        <p className="mt-sm text-caption text-semantic-critical">{error}</p>
      )}
    </div>
  )
}
