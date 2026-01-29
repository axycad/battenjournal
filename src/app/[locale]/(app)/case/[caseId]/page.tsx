'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Link } from '@/navigation'
import { useTranslations } from 'next-intl'
import { getCaseAPI, getEventsAPI, getUpcomingAppointmentsAPI, type Event } from '@/lib/api'
import { EVENT_TYPES } from '@/lib/event-types'
import { Button } from '@/components/ui'
import { UpcomingAppointmentsWidget } from '@/components/appointments/upcoming-appointments-widget'

interface CaseData {
  id: string
  childDisplayName: string
  currentUserRole: string
  currentUserMemberType: string
  allergies: Array<{ id: string; substance: string; reaction: string | null }>
  medications: Array<{ id: string; name: string; dose: string | null }>
  memberships: Array<{
    id: string
    memberType: string
    familyRole: string
    user: { name: string | null; email: string }
  }>
}

interface Appointment {
  id: string
  scheduledAt: Date
  type: string
  location: string | null
  notes: string | null
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

export default function CasePage() {
  const params = useParams()
  const caseId = params.caseId as string
  const t = useTranslations('caseOverview')

  const [caseData, setCaseData] = useState<CaseData | null>(null)
  const [events, setEvents] = useState<Event[]>([])
  const [upcomingAppointments, setUpcomingAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadData() {
      try {
        const [caseDataRes, eventsRes, appointmentsRes] = await Promise.all([
          getCaseAPI(caseId),
          getEventsAPI(caseId, { limit: 200 }),
          getUpcomingAppointmentsAPI(caseId, { limit: 3 }),
        ])

        setCaseData(caseDataRes as any)
        setEvents(eventsRes)
        setUpcomingAppointments(appointmentsRes)
      } catch (err) {
        console.error('Failed to load case overview:', err)
        setError('Failed to load case overview. Please refresh.')
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
            <p className="text-body text-text-secondary">Loading case overview...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error || !caseData) {
    return (
      <div className="max-w-3xl mx-auto px-md py-lg">
        <div className="bg-red-50 border border-red-200 rounded-lg p-md">
          <p className="text-body text-red-700">{error || 'Case not found'}</p>
        </div>
      </div>
    )
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
            className="text-meta text-purple-600 hover:text-purple-700 hover:underline"
          >
            ← Dashboard
          </Link>
          <h1 className="text-h2 font-bold text-text-primary mt-xs">{caseData.childDisplayName}</h1>
          {!isParent && (
            <p className="text-meta text-text-secondary">
              Clinical access
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-sm">
          <Link href={`/case/${caseId}/emergency`}>
            <Button variant="secondary" className="border-purple-200 hover:border-purple-400 hover:bg-purple-50">Emergency Card</Button>
          </Link>
          {isAdmin && (
            <>
              <Link href={`/case/${caseId}/sharing`}>
                <Button variant="secondary" className="border-purple-200 hover:border-purple-400 hover:bg-purple-50">Sharing</Button>
              </Link>
              <Link href={`/case/${caseId}/data`}>
                <Button variant="secondary" className="border-purple-200 hover:border-purple-400 hover:bg-purple-50">Data</Button>
              </Link>
              <Link href={`/case/${caseId}/settings`}>
                <Button variant="secondary" className="border-purple-200 hover:border-purple-400 hover:bg-purple-50">Settings</Button>
              </Link>
            </>
          )}
        </div>
      </div>

      <div className="space-y-md">
        {/* Quick actions - only for parents */}
        {isParent && (
          <div className="space-y-sm">
            {/* Quick actions bar */}
            <div className="p-md bg-white border border-purple-100 rounded-lg shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-sm">
                <div>
                  <h2 className="text-title-md font-semibold text-text-primary">Quick actions</h2>
                  <p className="text-meta text-text-secondary">
                    {todayEvents.length === 0
                      ? 'No observations logged today'
                      : `${todayEvents.length} observation${todayEvents.length > 1 ? 's' : ''} logged today`}
                  </p>
                </div>
                <div className="flex gap-sm">
                  <Link href={`/case/${caseId}/today`}>
                    <Button className="bg-gradient-to-r from-purple-600 to-pink-600 hover:shadow-lg">Log observation</Button>
                  </Link>
                  <Link href={`/case/${caseId}/trends`}>
                    <Button variant="secondary" className="border-purple-200 hover:border-purple-400 hover:bg-purple-50">View trends</Button>
                  </Link>
                </div>
              </div>
            </div>

            {/* Upcoming appointments */}
            {upcomingAppointments.length > 0 && (
              <div className="p-md bg-white border border-purple-100 rounded-lg shadow-sm">
                <UpcomingAppointmentsWidget
                  appointments={upcomingAppointments}
                  caseId={caseId}
                  childName={caseData.childDisplayName}
                  canEdit={canEdit}
                />
              </div>
            )}

            {/* Main navigation grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-sm">
              <Link
                href={`/case/${caseId}/profile`}
                className="p-md bg-white border-2 border-purple-100 rounded-lg hover:border-purple-300 hover:shadow-md transition-all"
              >
                <h2 className="text-title-md font-medium mb-xs">Profile</h2>
                <p className="text-meta text-text-secondary">
                  Medical info, allergies
                </p>
              </Link>
              <Link
                href={`/case/${caseId}/today`}
                className="p-md bg-white border-2 border-purple-100 rounded-lg hover:border-purple-300 hover:shadow-md transition-all"
              >
                <h2 className="text-title-md font-medium mb-xs">Today</h2>
                <p className="text-meta text-text-secondary">
                  Log observations
                </p>
              </Link>
              <Link
                href={`/case/${caseId}/appointments`}
                className="p-md bg-white border-2 border-purple-100 rounded-lg hover:border-purple-300 hover:shadow-md transition-all"
              >
                <h2 className="text-title-md font-medium mb-xs">Appointments</h2>
                <p className="text-meta text-text-secondary">
                  Upcoming and past
                </p>
              </Link>
              <Link
                href={`/case/${caseId}/medications`}
                className="p-md bg-white border-2 border-purple-100 rounded-lg hover:border-purple-300 hover:shadow-md transition-all"
              >
                <h2 className="text-title-md font-medium mb-xs">Medications</h2>
                <p className="text-meta text-text-secondary">
                  Track doses
                </p>
              </Link>
              <Link
                href={`/case/${caseId}/messages`}
                className="p-md bg-white border-2 border-purple-100 rounded-lg hover:border-purple-300 hover:shadow-md transition-all"
              >
                <h2 className="text-title-md font-medium mb-xs">Messages</h2>
                <p className="text-meta text-text-secondary">
                  Care team discussions
                </p>
              </Link>
              <Link
                href={`/case/${caseId}/documents`}
                className="p-md bg-white border-2 border-purple-100 rounded-lg hover:border-purple-300 hover:shadow-md transition-all"
              >
                <h2 className="text-title-md font-medium mb-xs">Documents</h2>
                <p className="text-meta text-text-secondary">
                  Reports, letters
                </p>
              </Link>
              <Link
                href={`/case/${caseId}/emergency`}
                className="p-md bg-white border-2 border-purple-100 rounded-lg hover:border-purple-300 hover:shadow-md transition-all"
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
          <div className="p-md bg-white border border-purple-100 rounded-lg shadow-sm">
            <p className="text-meta text-text-secondary mb-sm">
              You have view access to this patient's records based on your specialty.
            </p>
            <div className="flex flex-wrap gap-sm">
              <Link href={`/case/${caseId}/clinical`}>
                <Button variant="primary" className="bg-gradient-to-r from-purple-600 to-pink-600 hover:shadow-lg">Clinical overview</Button>
              </Link>
              <Link href={`/case/${caseId}/today`}>
                <Button variant="secondary" className="border-purple-200 hover:border-purple-400 hover:bg-purple-50">View timeline</Button>
              </Link>
              <Link href={`/case/${caseId}/trends`}>
                <Button variant="secondary" className="border-purple-200 hover:border-purple-400 hover:bg-purple-50">Trends</Button>
              </Link>
              <Link href={`/case/${caseId}/profile`}>
                <Button variant="secondary" className="border-purple-200 hover:border-purple-400 hover:bg-purple-50">View profile</Button>
              </Link>
              <Link href={`/case/${caseId}/messages`}>
                <Button variant="secondary" className="border-purple-200 hover:border-purple-400 hover:bg-purple-50">Messages</Button>
              </Link>
            </div>
          </div>
        )}

        {/* Allergies (critical display) */}
        {caseData.allergies.length > 0 && (
          <div className="p-md bg-white border border-purple-100 rounded-lg shadow-sm">
            <div className="flex items-center justify-between mb-sm">
              <h2 className="section-header">Allergies</h2>
              {canEdit && (
                <Link
                  href={`/case/${caseId}/profile`}
                  className="text-meta text-purple-600 hover:text-purple-700 hover:underline font-medium"
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
          <div className="p-md bg-white border border-purple-100 rounded-lg shadow-sm">
            <div className="flex items-center justify-between mb-sm">
              <h2 className="section-header">Active medications</h2>
              {canEdit && (
                <Link
                  href={`/case/${caseId}/profile`}
                  className="text-meta text-purple-600 hover:text-purple-700 hover:underline font-medium"
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
          <div className="p-md bg-white border border-purple-100 rounded-lg shadow-sm">
            <div className="flex items-center justify-between mb-sm">
              <h2 className="section-header">Family members</h2>
              {isAdmin && (
                <Link
                  href={`/case/${caseId}/settings`}
                  className="text-meta text-purple-600 hover:text-purple-700 hover:underline font-medium"
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
