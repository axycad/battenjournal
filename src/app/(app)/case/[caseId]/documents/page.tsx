import { notFound } from 'next/navigation'
import {Link} from '@/navigation'
import { getCase } from '@/actions/case'
import { getDocumentsForCase } from '@/actions/document'
import { getAllScopes } from '@/actions/event'
import { DocumentUploadForm } from './document-upload-form'
import { DocumentList } from './document-list'

interface DocumentsPageProps {
  params: Promise<{ caseId: string }>
}

export default async function DocumentsPage({ params }: DocumentsPageProps) {
  const { caseId } = await params
  const [caseData, documents, scopes] = await Promise.all([
    getCase(caseId),
    getDocumentsForCase(caseId),
    getAllScopes(),
  ])

  if (!caseData) {
    notFound()
  }

  const isParent = caseData.currentUserMemberType === 'PARENT'
  const canEdit = caseData.currentUserRole !== 'VIEWER' && isParent

  return (
    <div className="max-w-3xl mx-auto px-md py-lg">
      <div className="mb-lg">
        <Link
          href={`/case/${caseId}`}
          className="text-meta text-text-secondary hover:text-accent-primary"
        >
          ← Back to {caseData.childDisplayName}
        </Link>
        <h1 className="screen-title mt-xs">Documents</h1>
      </div>

      <div className="space-y-lg">
        {/* Upload form */}
        {canEdit && (
          <section className="p-md bg-white border border-divider rounded-md">
            <h2 className="section-header mb-md">Upload document</h2>
            <DocumentUploadForm caseId={caseId} scopes={scopes} />
          </section>
        )}

        {/* Document list */}
        <section className="p-md bg-white border border-divider rounded-md">
          <h2 className="section-header mb-md">All documents</h2>
          <DocumentList
            documents={documents}
            canEdit={canEdit}
            scopes={scopes}
          />
        </section>
      </div>
    </div>
  )
}
