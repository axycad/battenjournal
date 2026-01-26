'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui'
import { revokeMembership } from '@/actions/invite'

interface Member {
  id: string
  familyRole: string | null
  user: {
    id: string
    name: string | null
    email: string
  }
}

interface MemberListProps {
  caseId: string
  members: Member[]
}

export function MemberList({ caseId, members }: MemberListProps) {
  const { data: session } = useSession()
  const [removingId, setRemovingId] = useState<string | null>(null)
  const [confirmId, setConfirmId] = useState<string | null>(null)

  async function handleRemove(membershipId: string) {
    setRemovingId(membershipId)
    await revokeMembership(membershipId)
    setRemovingId(null)
    setConfirmId(null)
  }

  function roleLabel(role: string | null) {
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
      {members.map((member) => {
        const isCurrentUser = member.user.id === session?.user?.id
        const isAdmin = member.familyRole === 'OWNER_ADMIN'

        return (
          <li
            key={member.id}
            className="py-sm flex items-center justify-between"
          >
            <div>
              <p className="text-body">
                {member.user.name || member.user.email}
                {isCurrentUser && (
                  <span className="text-text-secondary"> (you)</span>
                )}
              </p>
              <p className="text-meta text-text-secondary">
                {member.user.email} · {roleLabel(member.familyRole)}
              </p>
            </div>

            {!isCurrentUser && !isAdmin && (
              <div>
                {confirmId === member.id ? (
                  <div className="flex gap-xs">
                    <Button
                      variant="destructive"
                      onClick={() => handleRemove(member.id)}
                      loading={removingId === member.id}
                      className="h-auto py-1 px-sm text-meta"
                    >
                      Remove
                    </Button>
                    <Button
                      variant="text"
                      onClick={() => setConfirmId(null)}
                      className="h-auto py-1 px-sm text-meta"
                    >
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="text"
                    onClick={() => setConfirmId(member.id)}
                    className="h-auto py-1 px-0 text-meta text-text-secondary"
                  >
                    Remove
                  </Button>
                )}
              </div>
            )}
          </li>
        )
      })}
    </ul>
  )
}
