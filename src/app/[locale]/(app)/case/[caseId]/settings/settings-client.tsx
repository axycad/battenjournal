'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Link } from '@/navigation'
import { getCaseAPI, getPendingInvitesAPI, type Invite } from '@/lib/api'
import { InviteForm } from './invite-form'
import { MemberList } from './member-list'
import { PendingInvites } from './pending-invites'

interface CaseData {
  id: string
  childDisplayName: string
  currentUserRole: string
}

export default function CaseSettingsPage() {
  const params = useParams()
  const router = useRouter()
  const caseId = params.caseId as string

  const [caseData, setCaseData] = useState<CaseData | null>(null)
  const [pendingInvites, setPendingInvites] = useState<Invite[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadData() {
      try {
        const caseDataRes = await getCaseAPI(caseId)
        setCaseData(caseDataRes as any)

        // Only OWNER_ADMIN can access settings
        if ((caseDataRes as any).currentUserRole !== 'OWNER_ADMIN') {
          router.push(`/case/${caseId}`)
          return
        }

        const invitesRes = await getPendingInvitesAPI(caseId)
        setPendingInvites(invitesRes)
      } catch (err) {
        console.error('Failed to load settings:', err)
        setError('Failed to load settings. Please refresh.')
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
            <p className="text-body text-text-secondary">Loading settings...</p>
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
        <h1 className="text-h2 font-bold text-text-primary mt-xs">Settings</h1>
      </div>

      <div className="space-y-lg">
        {/* Family members */}
        <section className="p-md bg-white border border-purple-100 rounded-lg shadow-sm">
          <h2 className="section-header mb-md">Family members</h2>
          <MemberList
            caseId={caseId}
            members={(caseData as any).memberships}
          />
        </section>

        {/* Pending invites */}
        {pendingInvites.length > 0 && (
          <section className="p-md bg-white border border-purple-100 rounded-lg shadow-sm">
            <h2 className="section-header mb-md">Pending invites</h2>
            <PendingInvites invites={pendingInvites as any} />
          </section>
        )}

        {/* Invite new member */}
        <section className="p-md bg-white border border-purple-100 rounded-lg shadow-sm">
          <h2 className="section-header mb-md">Invite family member</h2>
          <InviteForm caseId={caseId} childName={caseData.childDisplayName} />
        </section>
      </div>
    </div>
  )
}
