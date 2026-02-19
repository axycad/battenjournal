'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button, Input } from '@/components/ui'
import { addMeasurementAPI } from '@/lib/api/profile'
import { formatDate } from '@/lib/utils'
import type { PatientProfile } from '@prisma/client'

interface MeasurementsSectionProps {
  caseId: string
  profile: PatientProfile | null
  canEdit: boolean
}

export function MeasurementsSection({
  caseId,
  profile,
  canEdit,
}: MeasurementsSectionProps) {
  const router = useRouter()
  const [addingWeight, setAddingWeight] = useState(false)
  const [addingHeight, setAddingHeight] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [weight, setWeight] = useState('')
  const [height, setHeight] = useState('')

  async function handleSaveWeight() {
    if (!weight) return
    setSaving(true)
    setError('')
    try {
      await addMeasurementAPI(caseId, {
        weightKg: parseFloat(weight),
        measuredAt: new Date(),
      })
      setAddingWeight(false)
      setWeight('')
      router.refresh()
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  async function handleSaveHeight() {
    if (!height) return
    setSaving(true)
    setError('')
    try {
      await addMeasurementAPI(caseId, {
        heightCm: parseFloat(height),
        measuredAt: new Date(),
      })
      setAddingHeight(false)
      setHeight('')
      router.refresh()
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="p-md bg-white border border-divider rounded-md">
      <h2 className="section-header mb-md">Measurements</h2>

      <div className="grid grid-cols-2 gap-md">
        {/* Weight */}
        <div>
          <div className="flex items-center justify-between mb-xs">
            <span className="text-text-secondary">Weight</span>
            {canEdit && !addingWeight && (
              <Button
                variant="text"
                onClick={() => setAddingWeight(true)}
                className="h-auto px-0 text-meta"
              >
                Update
              </Button>
            )}
          </div>
          {addingWeight ? (
            <div className="space-y-xs">
              <div className="flex gap-xs items-end">
                <Input
                  type="number"
                  step="0.1"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  placeholder="0.0"
                  className="w-24"
                  autoFocus
                />
                <span className="text-text-secondary pb-3">kg</span>
              </div>
              <div className="flex gap-xs">
                <Button
                  variant="secondary"
                  onClick={() => {
                    setAddingWeight(false)
                    setWeight('')
                    setError('')
                  }}
                  disabled={saving}
                  className="h-auto py-1 px-sm text-meta"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveWeight}
                  loading={saving}
                  className="h-auto py-1 px-sm text-meta"
                >
                  Save
                </Button>
              </div>
            </div>
          ) : (
            <div>
              {profile?.weightKg ? (
                <>
                  <p className="text-title-md font-medium">{profile.weightKg} kg</p>
                  {profile.weightMeasuredAt && (
                    <p className="text-caption text-text-secondary">
                      {formatDate(profile.weightMeasuredAt)}
                    </p>
                  )}
                </>
              ) : (
                <p className="text-text-secondary">Not recorded</p>
              )}
            </div>
          )}
        </div>

        {/* Height */}
        <div>
          <div className="flex items-center justify-between mb-xs">
            <span className="text-text-secondary">Height</span>
            {canEdit && !addingHeight && (
              <Button
                variant="text"
                onClick={() => setAddingHeight(true)}
                className="h-auto px-0 text-meta"
              >
                Update
              </Button>
            )}
          </div>
          {addingHeight ? (
            <div className="space-y-xs">
              <div className="flex gap-xs items-end">
                <Input
                  type="number"
                  step="0.1"
                  value={height}
                  onChange={(e) => setHeight(e.target.value)}
                  placeholder="0.0"
                  className="w-24"
                  autoFocus
                />
                <span className="text-text-secondary pb-3">cm</span>
              </div>
              <div className="flex gap-xs">
                <Button
                  variant="secondary"
                  onClick={() => {
                    setAddingHeight(false)
                    setHeight('')
                    setError('')
                  }}
                  disabled={saving}
                  className="h-auto py-1 px-sm text-meta"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveHeight}
                  loading={saving}
                  className="h-auto py-1 px-sm text-meta"
                >
                  Save
                </Button>
              </div>
            </div>
          ) : (
            <div>
              {profile?.heightCm ? (
                <>
                  <p className="text-title-md font-medium">{profile.heightCm} cm</p>
                  {profile.heightMeasuredAt && (
                    <p className="text-caption text-text-secondary">
                      {formatDate(profile.heightMeasuredAt)}
                    </p>
                  )}
                </>
              ) : (
                <p className="text-text-secondary">Not recorded</p>
              )}
            </div>
          )}
        </div>
      </div>

      {error && <p className="mt-sm text-caption text-semantic-critical">{error}</p>}
    </section>
  )
}
