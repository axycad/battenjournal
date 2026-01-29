'use client'

import { useState } from 'react'
import { Button } from '@/components/ui'
import { cancelInviteAPI } from '@/lib/api/invites'
import { formatDate } from '@/lib/utils'

interface Invite {
  id: string
  email: string
  expiresAt: Date
  createdAt: Date
}

interface PendingClinicianInvitesProps {
  caseId: string
  invites: Invite[]
}

export function PendingClinicianInvites({ caseId, invites }: PendingClinicianInvitesProps) {
  const [cancellingId, setCancellingId] = useState<string | null>(null)

  async function handleCancel(inviteId: string) {
    setCancellingId(inviteId)
    await cancelInviteAPI(inviteId)
    setCancellingId(null)
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
              Expires {formatDate(invite.expiresAt)}
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
