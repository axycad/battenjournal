'use client'

import { useState } from 'react'
import { Button } from '@/components/ui'
import { cancelInvite } from '@/actions/invite'
import { formatDate } from '@/lib/utils'

interface Invite {
  id: string
  email: string
  familyRole: string
  expiresAt: Date
  createdAt: Date
}

interface PendingInvitesProps {
  invites: Invite[]
}

export function PendingInvites({ invites }: PendingInvitesProps) {
  const [cancellingId, setCancellingId] = useState<string | null>(null)

  async function handleCancel(inviteId: string) {
    setCancellingId(inviteId)
    await cancelInvite(inviteId)
    setCancellingId(null)
  }

  function roleLabel(role: string) {
    switch (role) {
      case 'OWNER_ADMIN':
        return 'Admin'
      case 'EDITOR':
        return 'Editor'
      case 'VIEWER':
        return 'Viewer'
      default:
        return 'Member'
    }
  }

  return (
    <ul className="divide-y divide-divider">
      {invites.map((invite) => (
        <li
          key={invite.id}
          className="py-sm flex items-center justify-between"
        >
          <div>
            <p className="text-body">{invite.email}</p>
            <p className="text-meta text-text-secondary">
              {roleLabel(invite.familyRole)} · Expires{' '}
              {formatDate(invite.expiresAt)}
            </p>
          </div>

          <Button
            variant="text"
            onClick={() => handleCancel(invite.id)}
            loading={cancellingId === invite.id}
            className="h-auto py-1 px-0 text-meta text-text-secondary"
          >
            Cancel
          </Button>
        </li>
      ))}
    </ul>
  )
}
