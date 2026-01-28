import { notFound, redirect } from 'next/navigation'
import {Link} from '@/navigation'
import { auth } from '@/lib/auth'
import { getCase } from '@/actions/case'
import { getAllScopes } from '@/actions/event'
import { getCaseNotes } from '@/actions/clinical-notes'
import { getFlagsForCase } from '@/actions/flags'
import { getTasksForCase, getCliniciansForCase } from '@/actions/tasks'
import { getWatchesForUser, getWatchedUpdates, getAvailableScopesForWatch } from '@/actions/watches'
import { ClinicalOverviewClient } from './clinical-overview-client'

interface ClinicalPageProps {
  params: Promise<{ caseId: string }>
}

export default async function ClinicalPage({ params }: ClinicalPageProps) {
  const { caseId } = await params
  const session = await auth()

  if (!session?.user?.id) {
    redirect(`/login`)
  }

  const caseData = await getCase(caseId)

  if (!caseData) {
    notFound()
  }

  // This page is for clinicians only
  if (caseData.currentUserMemberType !== 'CARE_TEAM') {
    redirect(`/case/${caseId}`)
  }

  const [notes, flags, tasks, watches, watchedUpdates, availableScopes, clinicians] = await Promise.all([
    getCaseNotes(caseId),
    getFlagsForCase(caseId, { includeResolved: true }),
    getTasksForCase(caseId, { includeCompleted: false }),
    getWatchesForUser(caseId),
    getWatchedUpdates(caseId),
    getAvailableScopesForWatch(caseId),
    getCliniciansForCase(caseId),
  ])

  return (
    <div className="max-w-3xl mx-auto px-md py-lg">
      <div className="mb-lg">
        <Link
          href={`/case/${caseId}`}
          className="text-meta text-purple-600 hover:text-purple-700 hover:underline"
        >
          ← Back to {caseData.childDisplayName}
        </Link>
        <h1 className="text-h2 font-bold text-text-primary mt-xs">Clinical overview</h1>
        <p className="text-meta text-text-secondary">
          Notes, flags, tasks, and watches for {caseData.childDisplayName}
        </p>
      </div>

      <ClinicalOverviewClient
        caseId={caseId}
        notes={notes}
        flags={flags}
        tasks={tasks}
        watches={watches}
        watchedUpdates={watchedUpdates}
        availableScopes={availableScopes}
        clinicians={clinicians}
        currentUserId={session.user.id}
      />
    </div>
  )
}
