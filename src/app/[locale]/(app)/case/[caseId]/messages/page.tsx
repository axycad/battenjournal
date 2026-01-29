'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { Link } from '@/navigation'
import { useSession } from 'next-auth/react'
import { useTranslations } from 'next-intl'
import { getCaseAPI, getThreadsAPI, type Thread } from '@/lib/api'
import { Button } from '@/components/ui'
import { ThreadList } from '@/components/messaging'
import { NewThreadFormWrapper } from './new-thread-wrapper'

interface CaseData {
  id: string
  childDisplayName: string
}

export default function MessagesPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()
  const { data: session } = useSession()
  const caseId = params.caseId as string
  const showNew = searchParams.get('new') === '1'
  const t = useTranslations('messagesPage')

  const [caseData, setCaseData] = useState<CaseData | null>(null)
  const [threads, setThreads] = useState<Thread[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!session?.user?.id) {
      router.push('/login')
      return
    }

    async function loadData() {
      try {
        const [caseDataRes, threadsRes] = await Promise.all([
          getCaseAPI(caseId),
          getThreadsAPI(caseId),
        ])

        setCaseData(caseDataRes as any)
        setThreads(threadsRes)
      } catch (err) {
        console.error('Failed to load messages:', err)
        setError('Failed to load messages. Please refresh.')
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
            <p className="text-body text-text-secondary">Loading messages...</p>
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

  // Separate case and event threads
  const caseThreads = threads.filter((t) => t.anchorType === 'CASE')
  const eventThreads = threads.filter((t) => t.anchorType === 'EVENT')

  return (
    <div className="max-w-3xl mx-auto px-md py-lg">
      <div className="mb-lg">
        <Link
          href={`/case/${caseId}`}
          className="text-meta text-purple-600 hover:text-purple-700 hover:underline"
        >
          ← {t('backToChild', { name: caseData.childDisplayName })}
        </Link>
        <div className="flex items-center justify-between mt-xs">
          <h1 className="text-h2 font-bold text-text-primary">{t('title')}</h1>
          {!showNew && (
            <Link href={`/case/${caseId}/messages?new=1`}>
              <Button className="bg-gradient-to-r from-purple-600 to-pink-600 hover:shadow-lg">{t('newDiscussion')}</Button>
            </Link>
          )}
        </div>
        <p className="text-meta text-text-secondary mt-xs">
          {t('subtitle')}
        </p>
      </div>

      {/* New thread form */}
      {showNew && session?.user?.id && (
        <div className="mb-lg">
          <NewThreadFormWrapper caseId={caseId} currentUserId={session.user.id} />
          <Link
            href={`/case/${caseId}/messages`}
            className="inline-block mt-sm text-meta text-purple-600 hover:text-purple-700 hover:underline"
          >
            {t('cancel')}
          </Link>
        </div>
      )}

      {/* Case-level threads */}
      <section className="mb-lg">
        <h2 className="section-header mb-sm">{t('generalDiscussions')}</h2>
        <ThreadList
          threads={caseThreads as any}
          caseId={caseId}
          basePath={`/case/${caseId}/messages`}
        />
      </section>

      {/* Event threads */}
      {eventThreads.length > 0 && (
        <section>
          <h2 className="section-header mb-sm">{t('eventDiscussions')}</h2>
          <ThreadList
            threads={eventThreads as any}
            caseId={caseId}
            basePath={`/case/${caseId}/messages`}
          />
        </section>
      )}

      {threads.length === 0 && !showNew && (
        <div className="text-center py-xl">
          <p className="text-body text-text-secondary mb-md">
            {t('emptyTitle')}
          </p>
          <Link href={`/case/${caseId}/messages?new=1`}>
            <Button className="bg-gradient-to-r from-purple-600 to-pink-600 hover:shadow-lg">{t('startDiscussion')}</Button>
          </Link>
        </div>
      )}
    </div>
  )
}
