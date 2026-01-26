import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getFullProfile } from '@/actions/profile'
import { getCase } from '@/actions/case'
import { Button } from '@/components/ui'
import { ProfileSection } from './profile-section'
import { BaselineSection } from './baseline-section'
import { AllergiesSection } from './allergies-section'
import { MedicationsSection } from './medications-section'
import { ConditionsSection } from './conditions-section'
import { ContactsSection } from './contacts-section'
import { CareIntentSection } from './care-intent-section'
import { MeasurementsSection } from './measurements-section'

interface ProfilePageProps {
  params: Promise<{ caseId: string }>
}

export default async function ProfilePage({ params }: ProfilePageProps) {
  const { caseId } = await params
  const [caseData, fullProfile] = await Promise.all([
    getCase(caseId),
    getFullProfile(caseId),
  ])

  if (!caseData || !fullProfile) {
    notFound()
  }

  const canEdit = caseData.currentUserRole !== 'VIEWER'

  return (
    <div className="max-w-3xl mx-auto px-md py-lg">
      <div className="flex items-center justify-between mb-lg">
        <div>
          <Link
            href={`/case/${caseId}`}
            className="text-meta text-text-secondary hover:text-accent-primary"
          >
            ← Back to {caseData.childDisplayName}
          </Link>
          <h1 className="screen-title mt-xs">Profile</h1>
        </div>
        <Link href={`/case/${caseId}/emergency`}>
          <Button variant="secondary">View Emergency Card</Button>
        </Link>
      </div>

      <div className="space-y-md">
        {/* Basic information */}
        <ProfileSection
          caseId={caseId}
          profile={fullProfile.profile}
          childDisplayName={caseData.childDisplayName}
          canEdit={canEdit}
        />

        {/* Measurements */}
        <MeasurementsSection
          caseId={caseId}
          profile={fullProfile.profile}
          canEdit={canEdit}
        />

        {/* Baseline status */}
        <BaselineSection
          caseId={caseId}
          profile={fullProfile.profile}
          canEdit={canEdit}
        />

        {/* Allergies */}
        <AllergiesSection
          caseId={caseId}
          allergies={fullProfile.allergies}
          canEdit={canEdit}
        />

        {/* Active medications */}
        <MedicationsSection
          caseId={caseId}
          medications={fullProfile.medications}
          canEdit={canEdit}
        />

        {/* Conditions */}
        <ConditionsSection
          caseId={caseId}
          conditions={fullProfile.conditions}
          canEdit={canEdit}
        />

        {/* Care contacts */}
        <ContactsSection
          caseId={caseId}
          contacts={fullProfile.careContacts}
          canEdit={canEdit}
        />

        {/* Care intent / emergency preferences */}
        <CareIntentSection
          caseId={caseId}
          careIntent={fullProfile.careIntent}
          canEdit={canEdit}
        />
      </div>
    </div>
  )
}
