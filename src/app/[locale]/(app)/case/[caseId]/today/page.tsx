'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Link } from '@/navigation'
import { useTranslations } from 'next-intl'
import { useSession } from 'next-auth/react'
import {
  getCaseAPI,
  getEventsAPI,
  getAllScopesAPI,
  getUpcomingAppointmentsAPI,
  type Scope,
  type Appointment,
  type Event,
} from '@/lib/api'
import { ImprovedQuickAddForm } from './improved-quick-add-form'
import { TimelineWithFilters } from './timeline-with-filters'
import { ProgressSummary } from '@/components/events/progress-summary'
import { UpcomingAppointmentsWidget } from '@/components/appointments/upcoming-appointments-widget'
import { AddAppointmentSection } from './add-appointment-section'

interface CaseData {
  id: string
  childDisplayName: string
  currentUserMemberType: string
  currentUserRole: string
}

export default function TodayPage() {
  const params = useParams()
  const caseId = params.caseId as string
  const { data: session } = useSession()
  const t = useTranslations('today')

  const [caseData, setCaseData] = useState<CaseData | null>(null)
  const [events, setEvents] = useState<any[]>([])
  const [scopes, setScopes] = useState<Scope[]>([])
  const [upcomingAppointments, setUpcomingAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadData() {
      try {
        const [caseDataRes, eventsRes, scopesRes, appointmentsRes] = await Promise.all([
          getCaseAPI(caseId),
          getEventsAPI(caseId, { limit: 100 }),
          getAllScopesAPI(),
          getUpcomingAppointmentsAPI(caseId, { limit: 5 }),
        ])

        setCaseData(caseDataRes as any)
        setEvents(eventsRes)
        setScopes(scopesRes)
        setUpcomingAppointments(appointmentsRes)
      } catch (err) {
        console.error('Failed to load today page:', err)
        setError('Failed to load page. Please refresh.')
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
            <p className="text-body text-text-secondary">Loading...</p>
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

  const isParent = caseData.currentUserMemberType === 'PARENT'
  const isClinician = caseData.currentUserMemberType === 'CARE_TEAM'
  const canEdit = caseData.currentUserRole !== 'VIEWER' && isParent

  return (
    <div className="max-w-3xl mx-auto px-md py-lg">
      <div className="mb-lg">
        <Link
          href={`/case/${caseId}`}
          className="text-meta text-purple-600 hover:text-purple-700 hover:underline"
        >
          ← {t('backToChild', { name: caseData.childDisplayName })}
        </Link>
        <h1 className="text-h2 font-bold text-text-primary mt-xs">
          {isClinician ? t('timelineTitle') : t('title')}
        </h1>
        {isClinician && (
          <p className="text-meta text-text-secondary">
            {t('clinicianView')} ·{' '}
            <Link
              href={`/case/${caseId}/clinical`}
              className="text-purple-600 hover:text-purple-700 hover:underline font-medium"
            >
              {t('clinicalOverview')}
            </Link>
          </p>
        )}
        <div className="mt-sm flex flex-wrap gap-sm">
          <Link
            href={`/case/${caseId}`}
            className="text-meta text-purple-600 hover:text-purple-700 hover:underline"
          >
            {t('overview')}
          </Link>
          <span className="text-meta text-text-secondary">·</span>
          <Link
            href={`/case/${caseId}/trends`}
            className="text-meta text-purple-600 hover:text-purple-700 hover:underline"
          >
            {t('trends')}
          </Link>
        </div>
      </div>

      {/* Record Summary - only for clinicians */}
      {isClinician && events.length > 0 && (
        <div className="mb-lg">
          <ProgressSummary
            events={events.map((e) => ({
              id: e.id,
              eventType: e.eventType,
              occurredAt: e.occurredAt,
              severity: e.severity,
            }))}
          />
        </div>
      )}

      {/* Quick add form - only for parents */}
      {canEdit && (
        <div className="mb-lg">
          <ImprovedQuickAddForm caseId={caseId} scopes={scopes} events={events} />
        </div>
      )}

      {/* Upcoming Appointments */}
      {upcomingAppointments.length > 0 && (
        <div className="mb-lg">
          <UpcomingAppointmentsWidget
            appointments={upcomingAppointments}
            caseId={caseId}
            childName={caseData.childDisplayName}
            canEdit={canEdit}
          />
        </div>
      )}

      {/* Add Appointment - only for parents */}
      {canEdit && (
        <div className="mb-lg">
          <AddAppointmentSection caseId={caseId} />
        </div>
      )}

      {/* Timeline with Filters */}
      <TimelineWithFilters
        events={events}
        canEdit={canEdit}
        scopes={scopes}
        caseId={caseId}
        childName={caseData.childDisplayName}
        isClinician={isClinician}
        currentUserId={session?.user?.id}
      />
    </div>
  )
}
