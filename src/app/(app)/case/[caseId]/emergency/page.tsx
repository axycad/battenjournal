import { notFound } from 'next/navigation'
import {Link} from '@/navigation'
import { getFullProfile } from '@/actions/profile'
import { formatDate } from '@/lib/utils'

interface EmergencyPageProps {
  params: Promise<{ caseId: string }>
}

function formatStatus(status: string | null | undefined): string {
  if (!status || status === 'UNKNOWN') return 'Unknown'
  return status
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace('Aac', 'AAC')
}

function severityOrder(severity: string | null): number {
  if (severity === 'LIFE_THREATENING') return 0
  if (severity === 'SEVERE') return 1
  if (severity === 'MODERATE') return 2
  if (severity === 'MILD') return 3
  return 4
}

export default async function EmergencyCardPage({ params }: EmergencyPageProps) {
  const { caseId } = await params
  const profile = await getFullProfile(caseId)

  if (!profile || !profile.profile) {
    notFound()
  }

  const p = profile.profile
  const intent = profile.careIntent
  const name = p.legalName || profile.childDisplayName

  // Sort allergies by severity
  const sortedAllergies = [...profile.allergies].sort(
    (a, b) => severityOrder(a.severity) - severityOrder(b.severity)
  )

  return (
    <div className="min-h-screen bg-white">
      {/* Header bar - not part of the card content */}
      <div className="bg-bg-primary border-b border-divider py-sm px-md">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <Link
            href={`/case/${caseId}/profile`}
            className="text-meta text-text-secondary hover:text-accent-primary"
          >
            ← Back to profile
          </Link>
          <span className="text-meta text-text-secondary">Emergency Card</span>
        </div>
      </div>

      {/* Emergency Card - designed for high contrast and quick scanning */}
      <div className="max-w-2xl mx-auto p-md">
        <div className="border-2 border-text-primary rounded-md overflow-hidden">
          {/* Name header */}
          <div className="bg-text-primary text-white p-md">
            <h1 className="text-2xl font-bold">{name}</h1>
            {p.dateOfBirth && (
              <p className="text-lg opacity-90">
                DOB: {formatDate(p.dateOfBirth)}
              </p>
            )}
          </div>

          {/* Allergies - most prominent */}
          <div className="p-md border-b-2 border-text-primary bg-red-50">
            <h2 className="text-lg font-bold text-semantic-critical mb-sm">
              ALLERGIES
            </h2>
            {sortedAllergies.length === 0 ? (
              <p className="text-lg">No known allergies</p>
            ) : (
              <ul className="space-y-xs">
                {sortedAllergies.map((allergy) => (
                  <li key={allergy.id} className="text-lg">
                    <span className="font-bold text-semantic-critical">
                      {allergy.substance}
                    </span>
                    {allergy.severity && (
                      <span className="ml-2 text-semantic-critical">
                        ({allergy.severity.toLowerCase().replace(/_/g, ' ')})
                      </span>
                    )}
                    {allergy.reaction && (
                      <span className="block text-base text-text-secondary">
                        Reaction: {allergy.reaction}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Blood type and weight */}
          <div className="p-md border-b border-divider grid grid-cols-2 gap-md">
            <div>
              <h2 className="text-meta font-bold text-text-secondary uppercase">
                Blood Type
              </h2>
              <p className="text-xl font-bold">
                {p.bloodType || 'Unknown'}
              </p>
            </div>
            <div>
              <h2 className="text-meta font-bold text-text-secondary uppercase">
                Weight
              </h2>
              <p className="text-xl font-bold">
                {p.weightKg ? `${p.weightKg} kg` : 'Unknown'}
              </p>
              {p.weightMeasuredAt && (
                <p className="text-caption text-text-secondary">
                  as of {formatDate(p.weightMeasuredAt)}
                </p>
              )}
            </div>
          </div>

          {/* Baseline status */}
          <div className="p-md border-b border-divider">
            <h2 className="text-meta font-bold text-text-secondary uppercase mb-sm">
              Baseline Status
            </h2>
            <div className="grid grid-cols-2 gap-sm text-body">
              <div>
                <span className="text-text-secondary">Vision:</span>{' '}
                <span className="font-medium">{formatStatus(p.visionStatus)}</span>
              </div>
              <div>
                <span className="text-text-secondary">Mobility:</span>{' '}
                <span className="font-medium">{formatStatus(p.mobilityStatus)}</span>
              </div>
              <div>
                <span className="text-text-secondary">Communication:</span>{' '}
                <span className="font-medium">{formatStatus(p.communicationStatus)}</span>
              </div>
              <div>
                <span className="text-text-secondary">Feeding:</span>{' '}
                <span className="font-medium">{formatStatus(p.feedingStatus)}</span>
              </div>
            </div>
            {intent?.communicationNotes && (
              <p className="mt-sm text-body">
                <span className="text-text-secondary">Note:</span>{' '}
                {intent.communicationNotes}
              </p>
            )}
          </div>

          {/* Key equipment */}
          {intent?.keyEquipment && (
            <div className="p-md border-b border-divider">
              <h2 className="text-meta font-bold text-text-secondary uppercase mb-sm">
                Key Equipment
              </h2>
              <p className="text-body font-medium">{intent.keyEquipment}</p>
            </div>
          )}

          {/* Active medications */}
          <div className="p-md border-b border-divider">
            <h2 className="text-meta font-bold text-text-secondary uppercase mb-sm">
              Current Medications
            </h2>
            {profile.medications.length === 0 ? (
              <p className="text-body">None</p>
            ) : (
              <ul className="space-y-xs">
                {profile.medications.map((med) => (
                  <li key={med.id} className="text-body">
                    <span className="font-medium">{med.name}</span>
                    {med.dose && <span> — {med.dose}</span>}
                    {med.route && <span> ({med.route})</span>}
                    {med.schedule && (
                      <span className="text-text-secondary"> — {med.schedule}</span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Emergency preferences */}
          {(intent?.emergencyPreferences || intent?.avoidList || intent?.preferredHospital) && (
            <div className="p-md border-b border-divider">
              <h2 className="text-meta font-bold text-text-secondary uppercase mb-sm">
                Emergency Instructions
              </h2>
              {intent?.preferredHospital && (
                <p className="text-body mb-xs">
                  <span className="font-medium">Preferred hospital:</span>{' '}
                  {intent.preferredHospital}
                </p>
              )}
              {intent?.emergencyPreferences && (
                <p className="text-body mb-xs whitespace-pre-wrap">
                  {intent.emergencyPreferences}
                </p>
              )}
              {intent?.avoidList && (
                <p className="text-body text-semantic-critical">
                  <span className="font-medium">AVOID:</span> {intent.avoidList}
                </p>
              )}
            </div>
          )}

          {/* Care contacts */}
          <div className="p-md">
            <h2 className="text-meta font-bold text-text-secondary uppercase mb-sm">
              Contacts
            </h2>
            {profile.careContacts.length === 0 ? (
              <p className="text-body">No contacts listed</p>
            ) : (
              <ul className="space-y-sm">
                {profile.careContacts.map((contact) => (
                  <li key={contact.id} className="text-body">
                    <span className="font-medium">{contact.role}:</span>{' '}
                    {contact.name}
                    {contact.phone && (
                      <a
                        href={`tel:${contact.phone}`}
                        className="ml-2 text-accent-primary font-medium"
                      >
                        {contact.phone}
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Conditions footer */}
          {profile.conditions.length > 0 && (
            <div className="p-md bg-bg-primary border-t border-divider">
              <h2 className="text-meta font-bold text-text-secondary uppercase mb-xs">
                Conditions
              </h2>
              <p className="text-body">
                {profile.conditions.map((c) => c.name).join(', ')}
              </p>
            </div>
          )}
        </div>

        {/* Print hint */}
        <p className="mt-md text-center text-meta text-text-secondary">
          This card can be printed or shown on screen to medical personnel.
        </p>
      </div>
    </div>
  )
}
