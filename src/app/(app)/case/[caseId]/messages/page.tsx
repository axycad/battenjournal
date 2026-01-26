import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { auth } from '@/lib/auth'
import { getCase } from '@/actions/case'
import { getThreadsForCase } from '@/actions/messaging'
import { Button } from '@/components/ui'
import { ThreadList, NewThreadForm } from '@/components/messaging'

interface MessagesPageProps {
  params: Promise<{ caseId: string }>
  searchParams: Promise<{ new?: string }>
}

export default async function MessagesPage({ params, searchParams }: MessagesPageProps) {
  const { caseId } = await params
  const { new: showNew } = await searchParams
  const session = await auth()

  if (!session?.user?.id) {
    redirect('/login')
  }

  const caseData = await getCase(caseId)

  if (!caseData) {
    notFound()
  }

  const threads = await getThreadsForCase(caseId)
  const isParent = caseData.currentUserMemberType === 'PARENT'

  // Separate case and event threads
  const caseThreads = threads.filter((t) => t.anchorType === 'CASE')
  const eventThreads = threads.filter((t) => t.anchorType === 'EVENT')

  return (
    <div className="max-w-3xl mx-auto px-md py-lg">
      <div className="mb-lg">
        <Link
          href={`/case/${caseId}`}
          className="text-meta text-text-secondary hover:text-accent-primary"
        >
          ← Back to {caseData.childDisplayName}
        </Link>
        <div className="flex items-center justify-between mt-xs">
          <h1 className="screen-title">Messages</h1>
          {isParent && !showNew && (
            <Link href={`/case/${caseId}/messages?new=1`}>
              <Button>New discussion</Button>
            </Link>
          )}
        </div>
        <p className="text-meta text-text-secondary mt-xs">
          Discussions with your care team
        </p>
      </div>

      {/* New thread form */}
      {showNew && isParent && (
        <div className="mb-lg">
          <NewThreadForm
            caseId={caseId}
            anchorType="case"
            anchorId={caseId}
            onCreated={(threadId) => {
              // Will redirect via router in component
            }}
            onCancel={() => {
              // Navigate back without ?new
            }}
          />
          <Link
            href={`/case/${caseId}/messages`}
            className="inline-block mt-sm text-meta text-text-secondary hover:text-text-primary"
          >
            Cancel
          </Link>
        </div>
      )}

      {/* Case-level threads */}
      <section className="mb-lg">
        <h2 className="section-header mb-sm">General discussions</h2>
        <ThreadList
          threads={caseThreads}
          caseId={caseId}
          basePath={`/case/${caseId}/messages`}
        />
      </section>

      {/* Event threads */}
      {eventThreads.length > 0 && (
        <section>
          <h2 className="section-header mb-sm">Event discussions</h2>
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
            No messages yet
          </p>
          {isParent && (
            <Link href={`/case/${caseId}/messages?new=1`}>
              <Button>Start a discussion</Button>
            </Link>
          )}
        </div>
      )}
    </div>
  )
}
