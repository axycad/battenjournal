import { notFound, redirect } from 'next/navigation'
import {Link} from '@/navigation'
import { auth } from '@/lib/auth'
import { getTranslations } from 'next-intl/server'
import { getCase } from '@/actions/case'
import { getThreadsForCase } from '@/actions/messaging'
import { Button } from '@/components/ui'
import { ThreadList } from '@/components/messaging'
import { NewThreadFormWrapper } from './new-thread-wrapper'

interface MessagesPageProps {
  params: Promise<{ caseId: string }>
  searchParams: Promise<{ new?: string }>
}

export default async function MessagesPage({
  params,
  searchParams,
}: MessagesPageProps) {
  const { caseId } = await params
  const { new: showNew } = await searchParams
  const session = await auth()
  const t = await getTranslations('messagesPage')

  if (!session?.user?.id) {
    redirect(`/login`)
  }

  const caseData = await getCase(caseId)

  if (!caseData) {
    notFound()
  }

  const threads = await getThreadsForCase(caseId)

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
      {showNew && (
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
          threads={caseThreads}
          caseId={caseId}
          basePath={`/case/${caseId}/messages`}
        />
      </section>

      {/* Event threads */}
      {eventThreads.length > 0 && (
        <section>
          <h2 className="section-header mb-sm">{t('eventDiscussions')}</h2>
          <ThreadList
            threads={eventThreads}
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
