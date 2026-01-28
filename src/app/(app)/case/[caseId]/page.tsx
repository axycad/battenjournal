import { notFound } from 'next/navigation'
import {Link} from '@/navigation'
import { getTranslations } from 'next-intl/server'
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

function getDayKey(date: Date): string {
  return date.toISOString().split('T')[0]
}

function getCheckInSummaryText(
  freeText: string | null | undefined,
  t: (key: string) => string
) {
  if (!freeText) return null
  const tokenMatch = freeText.match(/\[checkin:(better|same|worse|unsure)\]/)
  if (tokenMatch) {
    const status = tokenMatch[1]
    if (status === 'better') return t('summaryBetter')
    if (status === 'same') return t('summarySame')
    if (status === 'worse') return t('summaryTougher')
    if (status === 'unsure') return t('summaryUnsure')
  }
  const lower = freeText.toLowerCase()
  if (lower.includes('better than usual')) return t('summaryBetter')
  if (lower.includes('about the same')) return t('summarySame')
  if (lower.includes('more challenging than usual')) return t('summaryTougher')
  if (lower.includes('hard to say today')) return t('summaryUnsure')
  if (lower.includes('worse than usual')) return t('summaryTougher')
  return t('summaryLogged')
}

export default async function CasePage({ params }: CasePageProps) {
  const { caseId } = await params
  const t = await getTranslations('caseOverview')
  const [caseData, events] = await Promise.all([
    getCase(caseId),
    getEventsForCase(caseId, { limit: 200 }),
  ])

  if (!caseData) {
    notFound()
  }

  const isAdmin = caseData.currentUserRole === 'OWNER_ADMIN'
  const isParent = caseData.currentUserMemberType === 'PARENT'
  const canEdit = caseData.currentUserRole !== 'VIEWER' && isParent
  const recentEvents = events.slice(0, 5)
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)

  const todayEvents = events.filter((event) => event.occurredAt >= todayStart)
  const latestEvent = events[0]
  const todayCheckIn = todayEvents.find((event) => event.eventType === 'daily_checkin')
  const latestCheckIn = events.find((event) => event.eventType === 'daily_checkin')

  const last7Days: Date[] = []
  const last7Keys: string[] = []
  const startDate = new Date(todayStart)
  startDate.setDate(startDate.getDate() - 6)
  for (let i = 0; i < 7; i += 1) {
    const day = new Date(startDate)
    day.setDate(startDate.getDate() + i)
    last7Days.push(day)
    last7Keys.push(getDayKey(day))
  }

  const dailyCounts = last7Keys.map((key) =>
    events.filter((event) => getDayKey(event.occurredAt) === key).length
  )
  const maxDailyCount = Math.max(...dailyCounts, 1)

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
            <div className="p-md bg-white border border-divider rounded-md">
              <div className="flex flex-wrap items-center justify-between gap-sm">
                <div>
                  <h2 className="text-title-md font-medium">{t('logToday')}</h2>
                  <p className="text-meta text-text-secondary">
                    {t('quickCheckInDesc')}
                  </p>
                </div>
                <div className="flex gap-sm">
                  <Link href={`/case/${caseId}/today`}>
                    <Button>{t('quickCheckIn')}</Button>
                  </Link>
                  <Link href={`/case/${caseId}/trends`}>
                    <Button variant="secondary">{t('trends')}</Button>
                  </Link>
                </div>
              </div>
            </div>

            <div className="p-md bg-white border border-divider rounded-md">
              <div className="flex flex-wrap items-center justify-between gap-sm">
                <div>
                  <h2 className="text-title-md font-medium">{t('todaySummary')}</h2>
                  <p className="text-meta text-text-secondary">
                    {todayEvents.length === 0
                      ? t('noObservations')
                      : t('observationsLogged', { count: todayEvents.length })}
                  </p>
                </div>
                <Link
                  href={`/case/${caseId}/today`}
                  className="text-meta text-accent-primary hover:underline"
                >
                  {t('goToToday')}
                </Link>
              </div>

              <div className="mt-sm grid gap-sm sm:grid-cols-2">
                <div className="p-sm rounded-sm bg-bg-primary">
                  <p className="text-caption text-text-secondary">{t('latestCheckIn')}</p>
                  <p className="text-body">
                    {getCheckInSummaryText(todayCheckIn?.freeText, t)
                      ?? getCheckInSummaryText(latestCheckIn?.freeText, t)
                      ?? t('noCheckIn')}
                  </p>
                </div>
                <div className="p-sm rounded-sm bg-bg-primary">
                  <p className="text-caption text-text-secondary">{t('lastLog')}</p>
                  <p className="text-body">
                    {latestEvent
                      ? latestEvent.occurredAt.toLocaleTimeString('en-GB', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : t('noEntries')}
                  </p>
                </div>
              </div>

              <div className="mt-sm">
                <p className="text-caption text-text-secondary mb-xs">{t('last7Days')}</p>
                <div className="flex items-end gap-xs h-12">
                  {dailyCounts.map((count, index) => (
                    <div
                      key={`summary-${last7Keys[index]}`}
                      className="w-2 rounded-full bg-accent-primary/60"
                      style={{ height: `${Math.max(6, (count / maxDailyCount) * 40)}px` }}
                      title={`${count} logs`}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-sm">
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
              <Link href={`/case/${caseId}/trends`}>
                <Button variant="secondary">Trends</Button>
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
