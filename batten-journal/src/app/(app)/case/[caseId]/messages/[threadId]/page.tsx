import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { auth } from '@/lib/auth'
import { getCase } from '@/actions/case'
import { getThread } from '@/actions/messaging'
import { ThreadView } from '@/components/messaging'

interface ThreadPageProps {
  params: Promise<{ caseId: string; threadId: string }>
}

export default async function ThreadPage({ params }: ThreadPageProps) {
  const { caseId, threadId } = await params
  const session = await auth()

  if (!session?.user?.id) {
    redirect('/login')
  }

  const [caseData, threadData] = await Promise.all([
    getCase(caseId),
    getThread(threadId),
  ])

  if (!caseData) {
    notFound()
  }

  if (!threadData) {
    notFound()
  }

  // Verify thread belongs to case
  if (threadData.thread.caseId !== caseId) {
    notFound()
  }

  return (
    <div className="max-w-3xl mx-auto px-md py-lg">
      <div className="mb-lg">
        <Link
          href={`/case/${caseId}/messages`}
          className="text-meta text-text-secondary hover:text-accent-primary"
        >
          ← Back to messages
        </Link>
      </div>

      <ThreadView
        threadId={threadId}
        caseId={caseId}
        messages={threadData.messages}
        currentUserId={session.user.id}
        subject={threadData.thread.subject}
        anchorType={threadData.thread.anchorType}
      />
    </div>
  )
}
