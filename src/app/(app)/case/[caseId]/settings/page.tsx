import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { getCase } from '@/actions/case'
import { getPendingInvites } from '@/actions/invite'
import { InviteForm } from './invite-form'
import { MemberList } from './member-list'
import { PendingInvites } from './pending-invites'

interface SettingsPageProps {
  params: Promise<{ caseId: string }>
}

export default async function CaseSettingsPage({ params }: SettingsPageProps) {
  const { caseId } = await params
  const caseData = await getCase(caseId)

  if (!caseData) {
    notFound()
  }

  // Only OWNER_ADMIN can access settings
  if (caseData.currentUserRole !== 'OWNER_ADMIN') {
    redirect(`/case/${caseId}`)
  }

  const pendingInvites = await getPendingInvites(caseId)

  return (
    <div className="max-w-3xl mx-auto px-md py-lg">
      <div className="mb-lg">
        <Link
          href={`/case/${caseId}`}
          className="text-meta text-text-secondary hover:text-accent-primary"
        >
          ← Back to {caseData.childDisplayName}
        </Link>
        <h1 className="screen-title mt-xs">Settings</h1>
      </div>

      <div className="space-y-lg">
        {/* Family members */}
        <section className="p-md bg-white border border-divider rounded-md">
          <h2 className="section-header mb-md">Family members</h2>
          <MemberList
            caseId={caseId}
            members={caseData.memberships}
          />
        </section>

        {/* Pending invites */}
        {pendingInvites.length > 0 && (
          <section className="p-md bg-white border border-divider rounded-md">
            <h2 className="section-header mb-md">Pending invites</h2>
            <PendingInvites invites={pendingInvites} />
          </section>
        )}

        {/* Invite new member */}
        <section className="p-md bg-white border border-divider rounded-md">
          <h2 className="section-header mb-md">Invite family member</h2>
          <InviteForm caseId={caseId} childName={caseData.childDisplayName} />
        </section>
      </div>
    </div>
  )
}
