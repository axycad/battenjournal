import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getCase } from '@/actions/case'
import { getEventsForCase } from '@/actions/event'
import { EVENT_TYPES } from '@/lib/event-types'
import { Button } from '@/components/ui'

interface CasePageProps {
  params: Promise<{ caseId: string }>
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatRelativeDay(date: Date): string {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  const eventDate = new Date(date)
  eventDate.setHours(0, 0, 0, 0)

  if (eventDate.getTime() === today.getTime()) {
    return 'Today'
  }
  if (eventDate.getTime() === yesterday.getTime()) {
    return 'Yesterday'
  }

  return eventDate.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
  })
}

export default async function CasePage({ params }: CasePageProps) {
  const { caseId } = await params
  const [caseData, recentEvents] = await Promise.all([
    getCase(caseId),
    getEventsForCase(caseId, { limit: 5 }),
  ])

  if (!caseData) {
    notFound()
  }

  const isAdmin = caseData.currentUserRole === 'OWNER_ADMIN'
  const isParent = caseData.currentUserMemberType === 'PARENT'
  const canEdit = caseData.currentUserRole !== 'VIEWER' && isParent

  return (
    <div className="max-w-3xl mx-auto px-md py-lg">
      <div className="flex items-center justify-between mb-lg">
        <div>
          <Link
            href="/dashboard"
            className="text-meta text-text-secondary hover:text-accent-primary"
          >
            ← Dashboard
          </Link>
          <h1 className="screen-title mt-xs">{caseData.childDisplayName}</h1>
          {!isParent && (
            <p className="text-meta text-text-secondary">
              Clinical access
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-sm">
          <Link href={`/case/${caseId}/emergency`}>
            <Button variant="secondary">Emergency Card</Button>
          </Link>
          {isAdmin && (
            <>
              <Link href={`/case/${caseId}/sharing`}>
                <Button variant="secondary">Sharing</Button>
              </Link>
              <Link href={`/case/${caseId}/data`}>
                <Button variant="secondary">Data</Button>
              </Link>
              <Link href={`/case/${caseId}/settings`}>
                <Button variant="secondary">Settings</Button>
              </Link>
            </>
          )}
        </div>
      </div>

      <div className="space-y-md">
        {/* Quick actions - only for parents */}
        {isParent && (
          <div className="space-y-sm">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-sm">
              <Link
                href={`/case/${caseId}/profile`}
                className="p-md bg-white border border-divider rounded-md hover:border-accent-primary transition-colors"
              >
                <h2 className="text-title-md font-medium mb-xs">Profile</h2>
                <p className="text-meta text-text-secondary">
                  Medical info, allergies
                </p>
              </Link>
              <Link
                href={`/case/${caseId}/today`}
                className="p-md bg-white border border-divider rounded-md hover:border-accent-primary transition-colors"
              >
                <h2 className="text-title-md font-medium mb-xs">Today</h2>
                <p className="text-meta text-text-secondary">
                  Log observations
                </p>
              </Link>
              <Link
                href={`/case/${caseId}/medications`}
                className="p-md bg-white border border-divider rounded-md hover:border-accent-primary transition-colors"
              >
                <h2 className="text-title-md font-medium mb-xs">Medications</h2>
                <p className="text-meta text-text-secondary">
                  Track doses
                </p>
              </Link>
              <Link
                href={`/case/${caseId}/messages`}
                className="p-md bg-white border border-divider rounded-md hover:border-accent-primary transition-colors"
              >
                <h2 className="text-title-md font-medium mb-xs">Messages</h2>
                <p className="text-meta text-text-secondary">
                  Care team discussions
                </p>
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-sm">
              <Link
                href={`/case/${caseId}/documents`}
                className="p-md bg-white border border-divider rounded-md hover:border-accent-primary transition-colors"
              >
                <h2 className="text-title-md font-medium mb-xs">Documents</h2>
                <p className="text-meta text-text-secondary">
                  Reports, letters
                </p>
              </Link>
              <Link
                href={`/case/${caseId}/emergency`}
                className="p-md bg-white border border-divider rounded-md hover:border-accent-primary transition-colors"
              >
                <h2 className="text-title-md font-medium mb-xs">Emergency card</h2>
                <p className="text-meta text-text-secondary">
                  Quick reference
                </p>
              </Link>
            </div>
          </div>
        )}

        {/* Clinician view - simplified navigation */}
        {!isParent && (
          <div className="p-md bg-white border border-divider rounded-md">
            <p className="text-meta text-text-secondary mb-sm">
              You have view access to this patient's records based on your specialty.
            </p>
            <div className="flex flex-wrap gap-sm">
              <Link href={`/case/${caseId}/clinical`}>
                <Button variant="primary">Clinical overview</Button>
              </Link>
              <Link href={`/case/${caseId}/today`}>
                <Button variant="secondary">View timeline</Button>
              </Link>
              <Link href={`/case/${caseId}/profile`}>
                <Button variant="secondary">View profile</Button>
              </Link>
              <Link href={`/case/${caseId}/messages`}>
                <Button variant="secondary">Messages</Button>
              </Link>
            </div>
          </div>
        )}

        {/* Allergies (critical display) */}
        {caseData.allergies.length > 0 && (
          <div className="p-md bg-white border border-divider rounded-md">
            <div className="flex items-center justify-between mb-sm">
              <h2 className="section-header">Allergies</h2>
              {canEdit && (
                <Link
                  href={`/case/${caseId}/profile`}
                  className="text-meta text-accent-primary hover:underline"
                >
                  Edit
                </Link>
              )}
            </div>
            <ul className="space-y-xs">
              {caseData.allergies.map((allergy) => (
                <li key={allergy.id} className="critical-label">
                  {allergy.substance}
                  {allergy.reaction && (
                    <span className="text-text-secondary font-normal">
                      {' '}
                      — {allergy.reaction}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Active medications */}
        {caseData.medications.length > 0 && (
          <div className="p-md bg-white border border-divider rounded-md">
            <div className="flex items-center justify-between mb-sm">
              <h2 className="section-header">Active medications</h2>
              {canEdit && (
                <Link
                  href={`/case/${caseId}/profile`}
                  className="text-meta text-accent-primary hover:underline"
                >
                  Edit
                </Link>
              )}
            </div>
            <ul className="space-y-xs">
              {caseData.medications.map((med) => (
                <li key={med.id} className="text-body">
                  {med.name}
                  {med.dose && (
                    <span className="text-text-secondary"> — {med.dose}</span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Recent observations */}
        <div className="p-md bg-white border border-divider rounded-md">
          <div className="flex items-center justify-between mb-sm">
            <h2 className="section-header">Recent observations</h2>
            <Link
              href={`/case/${caseId}/today`}
              className="text-meta text-accent-primary hover:underline"
            >
              View all
            </Link>
          </div>
          {recentEvents.length === 0 ? (
            <p className="text-text-secondary">No observations yet</p>
          ) : (
            <ul className="divide-y divide-divider">
              {recentEvents.map((event) => {
                const typeConfig = EVENT_TYPES[event.eventType as keyof typeof EVENT_TYPES]
                const typeLabel = typeConfig?.label || event.eventType

                return (
                  <li key={event.id} className="py-sm">
                    <div className="flex items-center gap-sm">
                      <span className="text-body">{typeLabel}</span>
                      <span className="text-meta text-text-secondary">
                        {formatRelativeDay(event.occurredAt)} {formatTime(event.occurredAt)}
                      </span>
                    </div>
                    {event.freeText && (
                      <p className="text-meta text-text-secondary mt-xs line-clamp-1">
                        {event.freeText}
                      </p>
                    )}
                    {event.isPartiallyHidden && (
                      <p className="text-caption text-text-secondary italic mt-xs">
                        Some details not shared
                      </p>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        {/* Family members summary - only for parents */}
        {isParent && (
          <div className="p-md bg-white border border-divider rounded-md">
            <div className="flex items-center justify-between mb-sm">
              <h2 className="section-header">Family members</h2>
              {isAdmin && (
                <Link
                  href={`/case/${caseId}/settings`}
                  className="text-meta text-accent-primary hover:underline"
                >
                  Manage
                </Link>
              )}
            </div>
            <ul className="space-y-xs">
              {caseData.memberships
                .filter((m) => m.memberType === 'PARENT')
                .map((m) => (
                  <li key={m.id} className="text-body flex justify-between">
                    <span>{m.user.name || m.user.email}</span>
                    <span className="text-meta text-text-secondary">
                      {m.familyRole === 'OWNER_ADMIN'
                        ? 'Admin'
                        : m.familyRole === 'EDITOR'
                        ? 'Editor'
                        : 'Viewer'}
                    </span>
                  </li>
                ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}
