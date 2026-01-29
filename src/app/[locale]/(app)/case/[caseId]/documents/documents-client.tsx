'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Link } from '@/navigation'
import { getCaseAPI, getDocumentsAPI, getAllScopesAPI, type Document, type Scope } from '@/lib/api'
import { DocumentUploadForm } from './document-upload-form'
import { DocumentList } from './document-list'

interface CaseData {
  id: string
  childDisplayName: string
  currentUserRole: string
  currentUserMemberType: string
}

export default function DocumentsPage() {
  const params = useParams()
  const caseId = params.caseId as string

  const [caseData, setCaseData] = useState<CaseData | null>(null)
  const [documents, setDocuments] = useState<Document[]>([])
  const [scopes, setScopes] = useState<Scope[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadData() {
      try {
        const [caseDataRes, documentsRes, scopesRes] = await Promise.all([
          getCaseAPI(caseId),
          getDocumentsAPI(caseId),
          getAllScopesAPI(),
        ])

        setCaseData(caseDataRes as any)
        setDocuments(documentsRes)
        setScopes(scopesRes)
      } catch (err) {
        console.error('Failed to load documents:', err)
        setError('Failed to load documents. Please refresh.')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [caseId])

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-md py-lg">
        <div className="flex items-center justify-center py-xl">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mx-auto mb-md"></div>
            <p className="text-body text-text-secondary">Loading documents...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error || !caseData) {
    return (
      <div className="max-w-3xl mx-auto px-md py-lg">
        <div className="bg-red-50 border border-red-200 rounded-lg p-md">
          <p className="text-body text-red-700">{error || 'Case not found'}</p>
        </div>
      </div>
    )
  }

  const isParent = caseData.currentUserMemberType === 'PARENT'
  const canEdit = caseData.currentUserRole !== 'VIEWER' && isParent

  return (
    <div className="max-w-3xl mx-auto px-md py-lg">
      <div className="mb-lg">
        <Link
          href={`/case/${caseId}`}
          className="text-meta text-purple-600 hover:text-purple-700 hover:underline"
        >
          ← Back to {caseData.childDisplayName}
        </Link>
        <h1 className="text-h2 font-bold text-text-primary mt-xs">Documents</h1>
      </div>

      <div className="space-y-lg">
        {/* Upload form */}
        {canEdit && (
          <section className="p-md bg-white border border-purple-100 rounded-lg shadow-sm">
            <h2 className="section-header mb-md">Upload document</h2>
            <DocumentUploadForm caseId={caseId} scopes={scopes} />
          </section>
        )}

        {/* Document list */}
        <section className="p-md bg-white border border-divider rounded-md">
          <h2 className="section-header mb-md">All documents</h2>
          <DocumentList
            documents={documents as any}
            canEdit={canEdit}
            scopes={scopes}
          />
        </section>
      </div>
    </div>
  )
}
