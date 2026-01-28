import { notFound, redirect } from 'next/navigation'
import {Link} from '@/navigation'
import { auth } from '@/lib/auth'
import { getCase } from '@/actions/case'
import {
  getMedicationsWithStatus,
  getAdministrationHistory,
} from '@/actions/medication-admin'
import { MedicationList, AdministrationHistory } from '@/components/medications'

interface MedicationsPageProps {
  params: Promise<{ caseId: string }>
}

export default async function MedicationsPage({ params }: MedicationsPageProps) {
  const { caseId } = await params
  const session = await auth()

  if (!session?.user?.id) {
    redirect(`/login`)
  }

  const caseData = await getCase(caseId)

  if (!caseData) {
    notFound()
  }

  // Only parents can access medication administration
  if (caseData.currentUserMemberType !== 'PARENT') {
    redirect(`/case/${caseId}`)
  }

  const [medications, history] = await Promise.all([
    getMedicationsWithStatus(caseId),
    getAdministrationHistory(caseId, { limit: 20 }),
  ])

  return (
    <div className="max-w-3xl mx-auto px-md py-lg">
      <div className="mb-lg">
        <Link
          href={`/case/${caseId}`}
          className="text-meta text-text-secondary hover:text-accent-primary"
        >
          ← Back to {caseData.childDisplayName}
        </Link>
        <h1 className="screen-title mt-xs">Medications</h1>
        <p className="text-meta text-text-secondary">
          Track medication administration for {caseData.childDisplayName}
        </p>
      </div>

      {/* Active medications */}
      <section className="mb-xl">
        <div className="flex items-center justify-between mb-sm">
          <h2 className="section-header">Active medications</h2>
          <Link
            href={`/case/${caseId}/profile#medications`}
            className="text-meta text-accent-primary hover:underline"
          >
            Edit medications →
          </Link>
        </div>

        <MedicationList medications={medications} caseId={caseId} />
      </section>

      {/* Administration history */}
      <section>
        <h2 className="section-header mb-sm">Recent history</h2>
        <AdministrationHistory records={history} />
      </section>
    </div>
  )
}
