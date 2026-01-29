'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Link } from '@/navigation'
import { getCaseAPI, getFullProfileAPI, type FullProfileData } from '@/lib/api'
import { Button } from '@/components/ui'
import { ProfileSection } from './profile-section'
import { BaselineSection } from './baseline-section'
import { AllergiesSection } from './allergies-section'
import { MedicationsSection } from './medications-section'
import { ConditionsSection } from './conditions-section'
import { ContactsSection } from './contacts-section'
import { CareIntentSection } from './care-intent-section'
import { MeasurementsSection } from './measurements-section'

interface CaseData {
  id: string
  childDisplayName: string
  currentUserRole: string
}

export default function ProfilePage() {
  const params = useParams()
  const caseId = params.caseId as string

  const [caseData, setCaseData] = useState<CaseData | null>(null)
  const [fullProfile, setFullProfile] = useState<FullProfileData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadData() {
      try {
        const [caseDataRes, fullProfileRes] = await Promise.all([
          getCaseAPI(caseId),
          getFullProfileAPI(caseId),
        ])

        setCaseData(caseDataRes as any)
        setFullProfile(fullProfileRes)
      } catch (err) {
        console.error('Failed to load profile:', err)
        setError('Failed to load profile. Please refresh.')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [caseId])

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-md py-lg">
        <div className="flex items-center justify-center py-xl">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mx-auto mb-md"></div>
            <p className="text-body text-text-secondary">Loading profile...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error || !caseData || !fullProfile) {
    return (
      <div className="max-w-3xl mx-auto px-md py-lg">
        <div className="bg-red-50 border border-red-200 rounded-lg p-md">
          <p className="text-body text-red-700">{error || 'Profile not found'}</p>
        </div>
      </div>
    )
  }

  const canEdit = caseData.currentUserRole !== 'VIEWER'

  return (
    <div className="max-w-3xl mx-auto px-md py-lg">
      <div className="flex items-center justify-between mb-lg">
        <div>
          <Link
            href={`/case/${caseId}`}
            className="text-meta text-purple-600 hover:text-purple-700 hover:underline"
          >
            ← Back to {caseData.childDisplayName}
          </Link>
          <h1 className="text-h2 font-bold text-text-primary mt-xs">Profile</h1>
        </div>
        <Link href={`/case/${caseId}/emergency`}>
          <Button variant="secondary" className="border-purple-200 hover:border-purple-400 hover:bg-purple-50">View Emergency Card</Button>
        </Link>
      </div>

      <div className="space-y-md">
        {/* Basic information */}
        <ProfileSection
          caseId={caseId}
          profile={fullProfile.profile as any}
          childDisplayName={caseData.childDisplayName}
          canEdit={canEdit}
        />

        {/* Measurements */}
        <MeasurementsSection
          caseId={caseId}
          profile={fullProfile.profile as any}
          canEdit={canEdit}
        />

        {/* Baseline status */}
        <BaselineSection
          caseId={caseId}
          profile={fullProfile.profile as any}
          canEdit={canEdit}
        />

        {/* Allergies */}
        <AllergiesSection
          caseId={caseId}
          allergies={fullProfile.allergies as any}
          canEdit={canEdit}
        />

        {/* Active medications */}
        <MedicationsSection
          caseId={caseId}
          medications={fullProfile.medications as any}
          canEdit={canEdit}
        />

        {/* Conditions */}
        <ConditionsSection
          caseId={caseId}
          conditions={fullProfile.conditions as any}
          canEdit={canEdit}
        />

        {/* Care contacts */}
        <ContactsSection
          caseId={caseId}
          contacts={fullProfile.careContacts as any}
          canEdit={canEdit}
        />

        {/* Care intent / emergency preferences */}
        <CareIntentSection
          caseId={caseId}
          careIntent={fullProfile.careIntent as any}
          canEdit={canEdit}
        />
      </div>
    </div>
  )
}
