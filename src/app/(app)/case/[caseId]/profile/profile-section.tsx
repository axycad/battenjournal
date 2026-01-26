'use client'

import { useState } from 'react'
import { Button, Input, Select } from '@/components/ui'
import { updateProfile } from '@/actions/profile'
import { formatDate } from '@/lib/utils'
import type { PatientProfile } from '@prisma/client'

interface ProfileSectionProps {
  caseId: string
  profile: PatientProfile | null
  childDisplayName: string
  canEdit: boolean
}

const BLOOD_TYPES = [
  { value: '', label: 'Unknown' },
  { value: 'A+', label: 'A+' },
  { value: 'A-', label: 'A-' },
  { value: 'B+', label: 'B+' },
  { value: 'B-', label: 'B-' },
  { value: 'AB+', label: 'AB+' },
  { value: 'AB-', label: 'AB-' },
  { value: 'O+', label: 'O+' },
  { value: 'O-', label: 'O-' },
]

const SEX_OPTIONS = [
  { value: '', label: 'Not specified' },
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
]

export function ProfileSection({
  caseId,
  profile,
  childDisplayName,
  canEdit,
}: ProfileSectionProps) {
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [legalName, setLegalName] = useState(profile?.legalName || '')
  const [dateOfBirth, setDateOfBirth] = useState(
    profile?.dateOfBirth ? profile.dateOfBirth.toISOString().split('T')[0] : ''
  )
  const [sex, setSex] = useState(profile?.sex || '')
  const [bloodType, setBloodType] = useState(profile?.bloodType || '')
  const [nationalId, setNationalId] = useState(profile?.nationalId || '')
  const [insuranceProvider, setInsuranceProvider] = useState(profile?.insuranceProvider || '')
  const [insuranceNumber, setInsuranceNumber] = useState(profile?.insuranceNumber || '')

  async function handleSave() {
    setSaving(true)
    setError('')

    const result = await updateProfile(caseId, {
      legalName: legalName || undefined,
      dateOfBirth: dateOfBirth || undefined,
      sex: sex || undefined,
      bloodType: bloodType || undefined,
      nationalId: nationalId || undefined,
      insuranceProvider: insuranceProvider || undefined,
      insuranceNumber: insuranceNumber || undefined,
    })

    if (!result.success) {
      setError(result.error || 'Failed to save')
    } else {
      setEditing(false)
    }
    setSaving(false)
  }

  function handleCancel() {
    setLegalName(profile?.legalName || '')
    setDateOfBirth(profile?.dateOfBirth ? profile.dateOfBirth.toISOString().split('T')[0] : '')
    setSex(profile?.sex || '')
    setBloodType(profile?.bloodType || '')
    setNationalId(profile?.nationalId || '')
    setInsuranceProvider(profile?.insuranceProvider || '')
    setInsuranceNumber(profile?.insuranceNumber || '')
    setEditing(false)
    setError('')
  }

  if (editing) {
    return (
      <section className="p-md bg-white border border-divider rounded-md">
        <h2 className="section-header mb-md">Basic information</h2>
        <div className="space-y-sm">
          <Input
            label="Legal name"
            value={legalName}
            onChange={(e) => setLegalName(e.target.value)}
            placeholder={childDisplayName}
          />
          <Input
            label="Date of birth"
            type="date"
            value={dateOfBirth}
            onChange={(e) => setDateOfBirth(e.target.value)}
          />
          <div className="grid grid-cols-2 gap-sm">
            <Select
              label="Sex"
              value={sex}
              onChange={(e) => setSex(e.target.value)}
              options={SEX_OPTIONS}
            />
            <Select
              label="Blood type"
              value={bloodType}
              onChange={(e) => setBloodType(e.target.value)}
              options={BLOOD_TYPES}
            />
          </div>
          <div className="divider my-md" />
          <Input
            label="NHS number / National ID"
            value={nationalId}
            onChange={(e) => setNationalId(e.target.value)}
          />
          <div className="grid grid-cols-2 gap-sm">
            <Input
              label="Insurance provider"
              value={insuranceProvider}
              onChange={(e) => setInsuranceProvider(e.target.value)}
            />
            <Input
              label="Policy number"
              value={insuranceNumber}
              onChange={(e) => setInsuranceNumber(e.target.value)}
            />
          </div>

          {error && <p className="text-caption text-semantic-critical">{error}</p>}

          <div className="flex gap-sm pt-sm">
            <Button variant="secondary" onClick={handleCancel} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSave} loading={saving}>
              Save
            </Button>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="p-md bg-white border border-divider rounded-md">
      <div className="flex items-center justify-between mb-md">
        <h2 className="section-header">Basic information</h2>
        {canEdit && (
          <Button variant="text" onClick={() => setEditing(true)} className="h-auto px-0">
            Edit
          </Button>
        )}
      </div>
      <dl className="space-y-xs">
        <div className="flex justify-between">
          <dt className="text-text-secondary">Legal name</dt>
          <dd>{profile?.legalName || childDisplayName}</dd>
        </div>
        {profile?.dateOfBirth && (
          <div className="flex justify-between">
            <dt className="text-text-secondary">Date of birth</dt>
            <dd>{formatDate(profile.dateOfBirth)}</dd>
          </div>
        )}
        {profile?.sex && (
          <div className="flex justify-between">
            <dt className="text-text-secondary">Sex</dt>
            <dd className="capitalize">{profile.sex}</dd>
          </div>
        )}
        {profile?.bloodType && (
          <div className="flex justify-between">
            <dt className="text-text-secondary">Blood type</dt>
            <dd>{profile.bloodType}</dd>
          </div>
        )}
        {profile?.nationalId && (
          <div className="flex justify-between">
            <dt className="text-text-secondary">NHS / ID</dt>
            <dd>{profile.nationalId}</dd>
          </div>
        )}
        {(profile?.insuranceProvider || profile?.insuranceNumber) && (
          <div className="flex justify-between">
            <dt className="text-text-secondary">Insurance</dt>
            <dd>
              {profile.insuranceProvider}
              {profile.insuranceNumber && ` (${profile.insuranceNumber})`}
            </dd>
          </div>
        )}
      </dl>
    </section>
  )
}
