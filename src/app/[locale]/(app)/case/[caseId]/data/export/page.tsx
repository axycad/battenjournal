import { notFound, redirect } from 'next/navigation'
import {Link} from '@/navigation'
import { auth } from '@/lib/auth'
import { getCase } from '@/actions/case'
import { getAvailableScopesForExport } from '@/actions/export'
import { ExportForm } from './export-form'

interface ExportPageProps {
  params: Promise<{ caseId: string }>
}

export default async function ExportPage({ params }: ExportPageProps) {
  const { caseId } = await params
  const session = await auth()

  if (!session?.user?.id) {
    redirect(`/login`)
  }

  const caseData = await getCase(caseId)

  if (!caseData) {
    notFound()
  }

  // Check export access
  const isParent = caseData.currentUserMemberType === 'PARENT'
  const isAdmin = caseData.currentUserRole === 'OWNER_ADMIN'

  // For now, only parent admins can export
  // Clinicians would need EXPORT permission (handled in the action)
  if (!isParent || !isAdmin) {
    redirect(`/case/${caseId}`)
  }

  const availableScopes = await getAvailableScopesForExport(caseId)

  // Check for research consent
  const hasResearchConsent = false // TODO: implement research consent check

  return (
    <div className="max-w-3xl mx-auto px-md py-lg">
      <div className="mb-lg">
        <Link
          href={`/case/${caseId}/data`}
          className="text-meta text-text-secondary hover:text-accent-primary"
        >
          ← Back to data boundaries
        </Link>
        <h1 className="screen-title mt-xs">Export data</h1>
        <p className="text-meta text-text-secondary">
          Download {caseData.childDisplayName}'s health journal data
        </p>
      </div>

      <ExportForm
        caseId={caseId}
        availableScopes={availableScopes}
        hasResearchConsent={hasResearchConsent}
      />
    </div>
  )
}
