'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Link } from '@/navigation'
import { useSession } from 'next-auth/react'
import {
  getCaseAPI,
  getMedicationsAPI,
  getAdministrationHistoryAPI,
  type MedicationWithStatus,
  type AdministrationRecord,
} from '@/lib/api'
import { MedicationList, AdministrationHistory } from '@/components/medications'

interface CaseData {
  id: string
  childDisplayName: string
  currentUserMemberType: string
}

export default function MedicationsPage() {
  const params = useParams()
  const router = useRouter()
  const { data: session } = useSession()
  const caseId = params.caseId as string

  const [caseData, setCaseData] = useState<CaseData | null>(null)
  const [medications, setMedications] = useState<MedicationWithStatus[]>([])
  const [history, setHistory] = useState<AdministrationRecord[]>([])
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

        // Only parents can access medication administration
        if ((caseDataRes as any).currentUserMemberType !== 'PARENT') {
          router.push(`/case/${caseId}`)
          return
        }

        const [medicationsRes, historyRes] = await Promise.all([
          getMedicationsAPI(caseId),
          getAdministrationHistoryAPI(caseId, { limit: 20 }),
        ])

        setMedications(medicationsRes)
        setHistory(historyRes)
      } catch (err) {
        console.error('Failed to load medications:', err)
        setError('Failed to load medications. Please refresh.')
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
            <p className="text-body text-text-secondary">Loading medications...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error || !caseData) {
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
        <h1 className="text-h2 font-bold text-text-primary mt-xs">Medications</h1>
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
            className="text-meta text-purple-600 hover:text-purple-700 hover:underline font-medium"
          >
            Edit medications →
          </Link>
        </div>

        <MedicationList medications={medications as any} caseId={caseId} />
      </section>

      {/* Administration history */}
      <section>
        <h2 className="section-header mb-sm">Recent history</h2>
        <AdministrationHistory records={history as any} />
      </section>
    </div>
  )
}
