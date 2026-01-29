'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Link } from '@/navigation'
import {
  getCaseAPI,
  getCliniciansAPI,
  getPendingClinicianInvitesAPI,
  getAllScopesAPI,
  type Clinician,
  type ClinicianInvite,
  type Scope,
} from '@/lib/api'
import { ClinicianInviteForm } from './clinician-invite-form'
import { ClinicianList } from './clinician-list'
import { PendingClinicianInvites } from './pending-clinician-invites'

interface CaseData {
  id: string
  childDisplayName: string
  currentUserRole: string
}

export default function SharingPage() {
  const params = useParams()
  const router = useRouter()
  const caseId = params.caseId as string

  const [caseData, setCaseData] = useState<CaseData | null>(null)
  const [clinicians, setClinicians] = useState<Clinician[]>([])
  const [pendingInvites, setPendingInvites] = useState<ClinicianInvite[]>([])
  const [scopes, setScopes] = useState<Scope[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadData() {
      try {
        const caseDataRes = await getCaseAPI(caseId)
        setCaseData(caseDataRes as any)

        // Only OWNER_ADMIN can access sharing
        if ((caseDataRes as any).currentUserRole !== 'OWNER_ADMIN') {
          router.push(`/case/${caseId}`)
          return
        }

        const [cliniciansRes, invitesRes, scopesRes] = await Promise.all([
          getCliniciansAPI(caseId),
          getPendingClinicianInvitesAPI(caseId),
          getAllScopesAPI(),
        ])

        setClinicians(cliniciansRes)
        setPendingInvites(invitesRes)
        setScopes(scopesRes)
      } catch (err) {
        console.error('Failed to load sharing settings:', err)
        setError('Failed to load sharing settings. Please refresh.')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [caseId, router])

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-md py-lg">
        <div className="flex items-center justify-center py-xl">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mx-auto mb-md"></div>
            <p className="text-body text-text-secondary">Loading sharing settings...</p>
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

  const activeClinicians = clinicians.filter((c) => (c as any).status !== 'REVOKED')

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
              clinicians={activeClinicians as any}
              scopes={scopes}
            />
          </section>
        )}

        {/* Pending invites */}
        {pendingInvites.length > 0 && (
          <section className="p-md bg-white border border-purple-100 rounded-lg shadow-sm">
            <h2 className="section-header mb-md">Pending invites</h2>
            <PendingClinicianInvites caseId={caseId} invites={pendingInvites as any} />
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
