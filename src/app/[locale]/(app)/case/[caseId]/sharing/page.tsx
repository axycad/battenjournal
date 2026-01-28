import { notFound, redirect } from 'next/navigation'
import {Link} from '@/navigation'
import { getCase } from '@/actions/case'
import { getCliniciansForCase, getPendingClinicianInvites } from '@/actions/sharing'
import { getAllScopes } from '@/actions/event'
import { ClinicianInviteForm } from './clinician-invite-form'
import { ClinicianList } from './clinician-list'
import { PendingClinicianInvites } from './pending-clinician-invites'

interface SharingPageProps {
  params: Promise<{ caseId: string }>
}

export default async function SharingPage({ params }: SharingPageProps) {
  const { caseId } = await params
  const caseData = await getCase(caseId)

  if (!caseData) {
    notFound()
  }

  if (caseData.currentUserRole !== 'OWNER_ADMIN') {
    redirect(`/case/${caseId}`)
  }

  const [clinicians, pendingInvites, scopes] = await Promise.all([
    getCliniciansForCase(caseId),
    getPendingClinicianInvites(caseId),
    getAllScopes(),
  ])

  const activeClinicians = clinicians.filter((c) => c.status !== 'REVOKED')

  return (
    <div className="max-w-3xl mx-auto px-md py-lg">
      <div className="mb-lg">
        <Link
          href={`/case/${caseId}`}
          className="text-meta text-purple-600 hover:text-purple-700 hover:underline"
        >
          ← Back to {caseData.childDisplayName}
        </Link>
        <h1 className="text-h2 font-bold text-text-primary mt-xs">Sharing</h1>
        <p className="text-body text-text-secondary mt-xs">
          Control who can see {caseData.childDisplayName}'s records
        </p>
      </div>

      <div className="space-y-lg">
        {/* Current clinicians */}
        {activeClinicians.length > 0 && (
          <section className="p-md bg-white border border-purple-100 rounded-lg shadow-sm">
            <h2 className="section-header mb-md">Care team access</h2>
            <ClinicianList
              caseId={caseId}
              clinicians={activeClinicians}
              scopes={scopes}
            />
          </section>
        )}

        {/* Pending invites */}
        {pendingInvites.length > 0 && (
          <section className="p-md bg-white border border-purple-100 rounded-lg shadow-sm">
            <h2 className="section-header mb-md">Pending invites</h2>
            <PendingClinicianInvites caseId={caseId} invites={pendingInvites} />
          </section>
        )}

        {/* Invite new clinician */}
        <section className="p-md bg-white border border-divider rounded-md">
          <h2 className="section-header mb-md">Invite a clinician</h2>
          <ClinicianInviteForm caseId={caseId} childName={caseData.childDisplayName} />
        </section>

        {/* Info about consent */}
        <section className="p-md bg-purple-50 border border-purple-100 rounded-lg">
          <h2 className="text-body font-medium mb-sm">How sharing works</h2>
          <ul className="space-y-xs text-meta text-text-secondary">
            <li>You control exactly what each clinician can see</li>
            <li>Clinicians select their specialty when accepting, which sets default categories</li>
            <li>You can adjust categories at any time</li>
            <li>Pause access temporarily or revoke it completely</li>
            <li>All access is logged for your records</li>
          </ul>
        </section>
      </div>
    </div>
  )
}
