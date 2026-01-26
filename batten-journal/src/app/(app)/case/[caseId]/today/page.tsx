import { notFound } from 'next/navigation'
import Link from 'next/link'
import { auth } from '@/lib/auth'
import { getCase } from '@/actions/case'
import { getEventsForCase, getAllScopes } from '@/actions/event'
import { QuickAddForm } from './quick-add-form'
import { EventTimeline } from './event-timeline'

interface TodayPageProps {
  params: Promise<{ caseId: string }>
}

export default async function TodayPage({ params }: TodayPageProps) {
  const { caseId } = await params
  const session = await auth()
  
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

  return (
    <div className="max-w-3xl mx-auto px-md py-lg">
      <div className="mb-lg">
        <Link
          href={`/case/${caseId}`}
          className="text-meta text-text-secondary hover:text-accent-primary"
        >
          ← Back to {caseData.childDisplayName}
        </Link>
        <h1 className="screen-title mt-xs">
          {isClinician ? 'Timeline' : 'Today'}
        </h1>
        {isClinician && (
          <p className="text-meta text-text-secondary">
            Viewing as clinician · <Link href={`/case/${caseId}/clinical`} className="text-accent-primary hover:underline">Clinical overview</Link>
          </p>
        )}
      </div>

      {/* Quick add form - only for parents */}
      {canEdit && (
        <div className="mb-lg">
          <QuickAddForm caseId={caseId} scopes={scopes} />
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
