import { notFound } from 'next/navigation'
import {Link} from '@/navigation'
import { getTranslations } from 'next-intl/server'
import { auth } from '@/lib/auth'
import { getCase } from '@/actions/case'
import { getEventsForCase, getAllScopes } from '@/actions/event'
import { QuickAddForm } from './quick-add-form'
import { EventTimeline } from './event-timeline'
import { ProgressSummary } from '@/components/events/progress-summary'

interface TodayPageProps {
  params: Promise<{ caseId: string }>
}

export default async function TodayPage({ params }: TodayPageProps) {
  const { caseId } = await params
  const session = await auth()
  const t = await getTranslations('today')
  
  const [caseData, events, scopes] = await Promise.all([
    getCase(caseId),
    getEventsForCase(caseId, { limit: 100 }),
    getAllScopes(),
  ])

  if (!caseData) {
    notFound()
  }

  const isParent = caseData.currentUserMemberType === 'PARENT'
  const isClinician = caseData.currentUserMemberType === 'CARE_TEAM'
  const canEdit = caseData.currentUserRole !== 'VIEWER' && isParent
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)

  const todayEvents = events.filter((event) => event.occurredAt >= todayStart)
  const latestEvent = events[0]
  const todayCheckIn = todayEvents.find((event) => event.eventType === 'daily_checkin')
  const latestCheckIn = events.find((event) => event.eventType === 'daily_checkin')

  function getCheckInSummaryText(freeText?: string | null) {
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

      {!isClinician && (
        <div className="mb-lg p-md bg-white border border-divider rounded-md">
          <div className="flex flex-wrap items-center justify-between gap-sm">
            <div>
              <h2 className="section-header">{t('todaySummary')}</h2>
              <p className="text-meta text-text-secondary">
                {todayEvents.length === 0
                  ? t('noObservations')
                  : t('observationsLogged', { count: todayEvents.length })}
              </p>
            </div>
            <Link
              href={`/case/${caseId}/trends`}
              className="text-meta text-accent-primary hover:underline"
            >
              {t('viewTrends')}
            </Link>
          </div>

          <div className="mt-sm grid gap-sm sm:grid-cols-2">
            <div className="p-sm rounded-sm bg-bg-primary">
              <p className="text-caption text-text-secondary">{t('latestCheckIn')}</p>
              <p className="text-body">
                {getCheckInSummaryText(todayCheckIn?.freeText)
                  ?? getCheckInSummaryText(latestCheckIn?.freeText)
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
          <p className="text-caption text-text-secondary mt-sm">
            {t('missedDaysOk')}
          </p>
        </div>
      )}

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

      {/* Timeline */}
      <EventTimeline
        events={events}
        canEdit={canEdit}
        scopes={scopes}
        caseId={caseId}
        isClinician={isClinician}
        currentUserId={session?.user?.id}
      />
    </div>
  )
}
