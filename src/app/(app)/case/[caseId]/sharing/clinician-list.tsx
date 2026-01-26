'use client'

import { useState } from 'react'
import { Button } from '@/components/ui'
import {
  updateClinicianScopes,
  pauseClinicianAccess,
  resumeClinicianAccess,
  revokeClinicianAccess,
  SPECIALTIES,
  type ClinicianShare,
} from '@/actions/sharing'
import type { Scope } from '@prisma/client'

interface ClinicianListProps {
  caseId: string
  clinicians: ClinicianShare[]
  scopes: Scope[]
}

export function ClinicianList({ caseId, clinicians, scopes }: ClinicianListProps) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [confirmAction, setConfirmAction] = useState<{
    userId: string
    action: 'pause' | 'resume' | 'revoke'
  } | null>(null)
  const [selectedScopes, setSelectedScopes] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function startEdit(clinician: ClinicianShare) {
    setEditingId(clinician.userId)
    setSelectedScopes(clinician.grantedScopes.map((s) => s.code))
    setError('')
  }

  function cancelEdit() {
    setEditingId(null)
    setSelectedScopes([])
    setError('')
  }

  function toggleScope(code: string) {
    setSelectedScopes((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    )
  }

  async function handleSaveScopes(userId: string) {
    setSaving(true)
    setError('')

    const result = await updateClinicianScopes(caseId, userId, selectedScopes)

    if (!result.success) {
      setError(result.error || 'Failed to update')
    } else {
      setEditingId(null)
    }
    setSaving(false)
  }

  async function handleAction(userId: string, action: 'pause' | 'resume' | 'revoke') {
    setSaving(true)
    setError('')

    let result
    if (action === 'pause') {
      result = await pauseClinicianAccess(caseId, userId)
    } else if (action === 'resume') {
      result = await resumeClinicianAccess(caseId, userId)
    } else {
      result = await revokeClinicianAccess(caseId, userId)
    }

    if (!result.success) {
      setError(result.error || 'Failed')
    }

    setConfirmAction(null)
    setSaving(false)
  }

  function getSpecialtyLabel(specialty: string | null): string {
    if (!specialty) return 'Unknown specialty'
    const config = SPECIALTIES[specialty as keyof typeof SPECIALTIES]
    return config?.label || specialty
  }

  return (
    <ul className="divide-y divide-divider">
      {clinicians.map((clinician) => {
        const isEditing = editingId === clinician.userId
        const isConfirming = confirmAction?.userId === clinician.userId

        if (isConfirming) {
          const actionLabel =
            confirmAction.action === 'pause'
              ? 'Pause'
              : confirmAction.action === 'resume'
              ? 'Resume'
              : 'Revoke'
          const actionDesc =
            confirmAction.action === 'pause'
              ? 'temporarily suspend access'
              : confirmAction.action === 'resume'
              ? 'restore access'
              : 'permanently remove access'

          return (
            <li key={clinician.userId} className="py-md">
              <p className="text-body mb-sm">
                {actionLabel} access for {clinician.userName || clinician.userEmail}?
              </p>
              <p className="text-meta text-text-secondary mb-md">
                This will {actionDesc}.
              </p>
              {error && <p className="text-caption text-semantic-critical mb-sm">{error}</p>}
              <div className="flex gap-sm">
                <Button
                  variant="secondary"
                  onClick={() => setConfirmAction(null)}
                  disabled={saving}
                  className="h-auto py-2"
                >
                  Cancel
                </Button>
                <Button
                  variant={confirmAction.action === 'revoke' ? 'destructive' : 'primary'}
                  onClick={() => handleAction(clinician.userId, confirmAction.action)}
                  loading={saving}
                  className="h-auto py-2"
                >
                  {actionLabel}
                </Button>
              </div>
            </li>
          )
        }

        if (isEditing) {
          return (
            <li key={clinician.userId} className="py-md">
              <div className="flex items-center justify-between mb-sm">
                <div>
                  <p className="text-body font-medium">
                    {clinician.userName || clinician.userEmail}
                  </p>
                  <p className="text-meta text-text-secondary">
                    {getSpecialtyLabel(clinician.specialty)}
                  </p>
                </div>
                <Button
                  variant="text"
                  onClick={cancelEdit}
                  className="h-auto px-0 text-meta"
                >
                  Cancel
                </Button>
              </div>

              <div className="mb-sm">
                <p className="text-meta text-text-secondary mb-xs">
                  Select which categories this clinician can view:
                </p>
                <div className="flex flex-wrap gap-xs">
                  {scopes.map((scope) => (
                    <button
                      key={scope.id}
                      type="button"
                      onClick={() => toggleScope(scope.code)}
                      className={`px-sm py-1 text-meta rounded-sm border transition-colors ${
                        selectedScopes.includes(scope.code)
                          ? 'border-accent-primary bg-accent-primary/10 text-accent-primary'
                          : 'border-divider text-text-secondary hover:border-accent-primary'
                      }`}
                    >
                      {scope.label}
                    </button>
                  ))}
                </div>
              </div>

              {error && <p className="text-caption text-semantic-critical mb-sm">{error}</p>}

              <Button
                onClick={() => handleSaveScopes(clinician.userId)}
                loading={saving}
                className="h-auto py-2"
              >
                Save changes
              </Button>
            </li>
          )
        }

        return (
          <li key={clinician.userId} className="py-md">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-sm">
                  <p className="text-body font-medium">
                    {clinician.userName || clinician.userEmail}
                  </p>
                  {clinician.status === 'PAUSED' && (
                    <span className="px-sm py-0.5 text-caption bg-semantic-warning/20 text-semantic-warning rounded">
                      Paused
                    </span>
                  )}
                </div>
                <p className="text-meta text-text-secondary">
                  {getSpecialtyLabel(clinician.specialty)}
                </p>

                {/* Scope chips */}
                <div className="flex flex-wrap gap-xs mt-sm">
                  {clinician.grantedScopes.map((scope) => (
                    <span
                      key={scope.code}
                      className="px-sm py-0.5 text-caption bg-bg-primary rounded-sm text-text-secondary"
                    >
                      {scope.label}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-xs ml-sm">
                <Button
                  variant="text"
                  onClick={() => startEdit(clinician)}
                  className="h-auto px-0 text-meta"
                >
                  Edit access
                </Button>
                {clinician.status === 'ACTIVE' ? (
                  <Button
                    variant="text"
                    onClick={() =>
                      setConfirmAction({ userId: clinician.userId, action: 'pause' })
                    }
                    className="h-auto px-0 text-meta text-text-secondary"
                  >
                    Pause
                  </Button>
                ) : clinician.status === 'PAUSED' ? (
                  <Button
                    variant="text"
                    onClick={() =>
                      setConfirmAction({ userId: clinician.userId, action: 'resume' })
                    }
                    className="h-auto px-0 text-meta text-accent-primary"
                  >
                    Resume
                  </Button>
                ) : null}
                <Button
                  variant="text"
                  onClick={() =>
                    setConfirmAction({ userId: clinician.userId, action: 'revoke' })
                  }
                  className="h-auto px-0 text-meta text-text-secondary"
                >
                  Revoke
                </Button>
              </div>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
