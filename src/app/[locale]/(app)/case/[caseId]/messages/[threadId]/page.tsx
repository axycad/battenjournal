import { notFound, redirect } from 'next/navigation'
import {Link} from '@/navigation'
import { auth } from '@/lib/auth'
import { getTranslations } from 'next-intl/server'
import { getCase } from '@/lib/api/cases'
import { getThreadWithMessages } from '@/lib/api/messaging'
import { ThreadView } from '@/components/messaging'

interface ThreadPageProps {
  params: Promise<{ caseId: string; threadId: string }>
}

export default async function ThreadPage({ params }: ThreadPageProps) {
  const { caseId, threadId } = await params
  const session = await auth()
  const t = await getTranslations('messagesThread')

  if (!session?.user?.id) {
    redirect(`/login`)
  }

  const caseData = await getCase(caseId)

  if (!caseData) {
    notFound()
  }

  const thread = await getThreadWithMessages(threadId)

  if (!thread) {
    notFound()
  }

  return (
    <div className="max-w-3xl mx-auto px-md py-lg">
      <div className="mb-lg">
        <Link
          href={`/case/${caseId}/messages`}
          className="text-meta text-text-secondary hover:text-accent-primary"
        >
          {'<-'} {t('backToMessages')}
        </Link>
      </div>

      <ThreadView
        threadId={threadId}
        caseId={caseId}
        messages={thread.messages}
        currentUserId={session.user.id}
        subject={thread.subject}
        anchorType={thread.anchorType as 'CASE' | 'EVENT'}
        participants={thread.participants.map(p => ({
          id: p.user.id,
          name: p.user.name,
          email: p.user.email,
          memberType: p.user.memberType,
        }))}
      />
    </div>
  )
}

// For Capacitor static export - generate a placeholder
// The actual caseId and threadId will be determined client-side from the URL
export const dynamicParams = true
export async function generateStaticParams() {
  // Return a placeholder path with both dynamic segments
  return [{ caseId: '_placeholder_', threadId: '_placeholder_' }]
}
