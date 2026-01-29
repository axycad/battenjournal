'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Link } from '@/navigation'
import { useSession } from 'next-auth/react'
import {
  getCaseAPI,
  getClinicalNotesAPI,
  getFlagsAPI,
  getCaseTasksAPI,
  getWatchesAPI,
  getWatchedUpdatesAPI,
  getAvailableScopesForWatchAPI,
  getCliniciansAPI,
  type ClinicalNote,
  type Flag,
  type CaseTask,
  type Watch,
  type WatchedUpdate,
  type AvailableScope,
  type Clinician,
} from '@/lib/api'
import { ClinicalOverviewClient } from './clinical-overview-client'

interface CaseData {
  id: string
  childDisplayName: string
  currentUserMemberType: string
}

export default function ClinicalPage() {
  const params = useParams()
  const router = useRouter()
  const { data: session } = useSession()
  const caseId = params.caseId as string

  const [caseData, setCaseData] = useState<CaseData | null>(null)
  const [notes, setNotes] = useState<ClinicalNote[]>([])
  const [flags, setFlags] = useState<Flag[]>([])
  const [tasks, setTasks] = useState<CaseTask[]>([])
  const [watches, setWatches] = useState<Watch[]>([])
  const [watchedUpdates, setWatchedUpdates] = useState<WatchedUpdate[]>([])
  const [availableScopes, setAvailableScopes] = useState<AvailableScope[]>([])
  const [clinicians, setClinicians] = useState<Clinician[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!session?.user?.id) {
      router.push('/login')
      return
    }

    async function loadData() {
      try {
        const caseDataRes = await getCaseAPI(caseId)
        setCaseData(caseDataRes as any)

        // Check if user is clinician
        if ((caseDataRes as any).currentUserMemberType !== 'CARE_TEAM') {
          router.push(`/case/${caseId}`)
          return
        }

        const [notesRes, flagsRes, tasksRes, watchesRes, updatesRes, scopesRes, cliniciansRes] =
          await Promise.all([
            getClinicalNotesAPI(caseId),
            getFlagsAPI(caseId, { includeResolved: true }),
            getCaseTasksAPI(caseId, { includeCompleted: false }),
            getWatchesAPI(caseId),
            getWatchedUpdatesAPI(caseId),
            getAvailableScopesForWatchAPI(caseId),
            getCliniciansAPI(caseId),
          ])

        setNotes(notesRes)
        setFlags(flagsRes)
        setTasks(tasksRes)
        setWatches(watchesRes)
        setWatchedUpdates(updatesRes)
        setAvailableScopes(scopesRes)
        setClinicians(cliniciansRes)
      } catch (err) {
        console.error('Failed to load clinical page:', err)
        setError('Failed to load clinical overview. Please refresh.')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [caseId, session, router])

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-md py-lg">
        <div className="flex items-center justify-center py-xl">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mx-auto mb-md"></div>
            <p className="text-body text-text-secondary">Loading clinical overview...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error || !caseData || !session?.user?.id) {
    return (
      <div className="max-w-3xl mx-auto px-md py-lg">
        <div className="bg-red-50 border border-red-200 rounded-lg p-md">
          <p className="text-body text-red-700">{error || 'Access denied'}</p>
        </div>
      </div>
    )
  }

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
        notes={notes as any}
        flags={flags as any}
        tasks={tasks as any}
        watches={watches as any}
        watchedUpdates={watchedUpdates as any}
        availableScopes={availableScopes as any}
        clinicians={clinicians as any}
        currentUserId={session.user.id}
      />
    </div>
  )
}
