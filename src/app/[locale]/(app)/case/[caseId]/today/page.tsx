import { notFound } from 'next/navigation'
import {Link} from '@/navigation'
import { getTranslations } from 'next-intl/server'
import { auth } from '@/lib/auth'
import { getCase } from '@/actions/case'
import { getEventsForCase, getAllScopes } from '@/actions/event'
import { QuickAddForm } from './quick-add-form'
import { TimelineWithFilters } from './timeline-with-filters'
import { ProgressSummary } from '@/components/events/progress-summary'
import { UpcomingAppointmentsWidget } from '@/components/appointments/upcoming-appointments-widget'
import { getUpcomingAppointments } from '@/actions/appointment'
import { AddAppointmentSection } from './add-appointment-section'

interface TodayPageProps {
  params: Promise<{ caseId: string }>
}

export default async function TodayPage({ params }: TodayPageProps) {
  const { caseId } = await params
  const session = await auth()
  const t = await getTranslations('today')
  
  const [caseData, events, scopes, upcomingAppointments] = await Promise.all([
    getCase(caseId),
    getEventsForCase(caseId, { limit: 100 }),
    getAllScopes(),
    getUpcomingAppointments(caseId, { limit: 5 }),
  ])

  if (!caseData) {
    notFound()
  }

  const isParent = caseData.currentUserMemberType === 'PARENT'
  const isClinician = caseData.currentUserMemberType === 'CARE_TEAM'
  const canEdit = caseData.currentUserRole !== 'VIEWER' && isParent


  return (
    <div className="max-w-3xl mx-auto px-md py-lg">
      <div className="mb-lg">
        <Link
          href={`/case/${caseId}`}
          className="text-meta text-text-secondary hover:text-accent-primary"
        >
          ← {t('backToChild', { name: caseData.childDisplayName })}
        </Link>
        <h1 className="screen-title mt-xs">
          {isClinician ? t('timelineTitle') : t('title')}
        </h1>
        {isClinician && (
          <p className="text-meta text-text-secondary">
            {t('clinicianView')} · <Link href={`/case/${caseId}/clinical`} className="text-accent-primary hover:underline">{t('clinicalOverview')}</Link>
          </p>
        )}
        <div className="mt-sm flex flex-wrap gap-sm">
          <Link
            href={`/case/${caseId}`}
            className="text-meta text-text-secondary hover:text-accent-primary"
          >
            {t('overview')}
          </Link>
          <span className="text-meta text-text-secondary">Â·</span>
          <Link
            href={`/case/${caseId}/trends`}
            className="text-meta text-text-secondary hover:text-accent-primary"
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
          <QuickAddForm caseId={caseId} scopes={scopes} events={events} />
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
