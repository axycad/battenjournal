'use client'

import { useConflicts } from '@/lib/offline'
import { ConflictResolution } from './conflict-resolution'

interface ConflictListProps {
  caseId?: string
}

export function ConflictList({ caseId }: ConflictListProps) {
  const allConflicts = useConflicts()

  // Filter by caseId if provided
  const conflicts = caseId
    ? allConflicts.filter((c) => c.caseId === caseId)
    : allConflicts

  if (conflicts.length === 0) {
    return null
  }

  return (
    <div className="space-y-md">
      <div className="flex items-center gap-sm">
        <span className="w-2 h-2 rounded-full bg-semantic-warning" />
        <h2 className="section-header">
          {conflicts.length} {conflicts.length === 1 ? 'item needs' : 'items need'} review
        </h2>
      </div>

      <div className="space-y-sm">
        {conflicts.map((conflict) => (
          <ConflictResolution key={conflict.id} conflict={conflict} />
        ))}
      </div>
    </div>
  )
}
