'use client'

import { useRef, useState } from 'react'
import { Button, Input, Select } from '@/components/ui'
import { updateProfileAPI } from '@/lib/api/profile'
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
  const [photoUrl, setPhotoUrl] = useState(profile?.photoUri || '')
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function handleSave() {
    setSaving(true)
    setError('')

    try {
      await updateProfileAPI(caseId, {
        legalName: legalName || undefined,
        dateOfBirth: dateOfBirth || undefined,
        sex: sex || undefined,
        bloodType: bloodType || undefined,
        nationalId: nationalId || undefined,
        insuranceProvider: insuranceProvider || undefined,
        insuranceNumber: insuranceNumber || undefined,
      } as any)

      setEditing(false)
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to save')
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
    setPhotoUrl(profile?.photoUri || '')
    setEditing(false)
    setError('')
  }

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    const validTypes = ['image/jpeg', 'image/png', 'image/heic', 'image/heif']
    if (!validTypes.includes(file.type)) {
      setError('Only images (JPG, PNG, HEIC) are allowed')
      return
    }

    if (file.size > 25 * 1024 * 1024) {
      setError('This file is larger than 25MB')
      return
    }

    setUploadingPhoto(true)
    setError('')

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('caseId', caseId)

      const response = await fetch('/api/profile-photo', {
        method: 'POST',
        body: formData,
      })

      const result = await response.json()
      if (!response.ok) {
        setError(result.error || 'Upload failed')
      } else {
        setPhotoUrl(result.url)
      }
    } catch {
      setError('Upload failed')
    } finally {
      setUploadingPhoto(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
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
      <div className="flex items-center gap-md mb-md">
        <div className="w-16 h-16 rounded-full overflow-hidden bg-bg-primary border border-divider flex items-center justify-center text-title-md">
          {photoUrl ? (
            <img
              src={photoUrl}
              alt={`${childDisplayName} photo`}
              className="w-full h-full object-cover"
            />
          ) : (
            <span>{childDisplayName.slice(0, 1).toUpperCase()}</span>
          )}
        </div>
        {canEdit && (
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/heic,image/heif"
              onChange={handlePhotoUpload}
              disabled={uploadingPhoto}
              className="hidden"
            />
            <Button
              variant="secondary"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingPhoto}
              className="h-auto"
            >
              {uploadingPhoto ? 'Uploading...' : 'Upload photo'}
            </Button>
            {error && <p className="text-caption text-semantic-critical mt-xs">{error}</p>}
          </div>
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
