import { notFound, redirect } from 'next/navigation'
import {Link} from '@/navigation'
import { auth } from '@/lib/auth'
import { getCase } from '@/actions/case'
import {
  getAccessSummary,
  getPermissionChanges,
  getDocumentAccessLog,
  getExportHistory,
} from '@/actions/audit'
import { formatDate } from '@/lib/utils'

interface DataPageProps {
  params: Promise<{ caseId: string }>
}

export default async function DataBoundariesPage({ params }: DataPageProps) {
  const { caseId } = await params
  const session = await auth()

  if (!session?.user?.id) {
    redirect(`/login`)
  }

  const caseData = await getCase(caseId)

  if (!caseData) {
    notFound()
  }

  // Only parent admins can view this page
  if (caseData.currentUserRole !== 'OWNER_ADMIN' || caseData.currentUserMemberType !== 'PARENT') {
    redirect(`/case/${caseId}`)
  }

  const [accessSummary, permissionChanges, documentAccess, exportHistory] = await Promise.all([
    getAccessSummary(caseId),
    getPermissionChanges(caseId, { limit: 20 }),
    getDocumentAccessLog(caseId, { limit: 50, cliniciansOnly: true }),
    getExportHistory(caseId),
  ])

  return (
    <div className="max-w-4xl mx-auto px-md py-lg">
      <div className="mb-lg">
        <Link
          href={`/case/${caseId}`}
          className="text-meta text-text-secondary hover:text-accent-primary"
        >
          ← Back to {caseData.childDisplayName}
        </Link>
        <h1 className="screen-title mt-xs">Data boundaries</h1>
        <p className="text-meta text-text-secondary">
          See who has access to {caseData.childDisplayName}'s information and track all data access
        </p>
      </div>

      <div className="space-y-lg">
        {/* Current Access */}
        <section className="p-md bg-white border border-divider rounded-md">
          <h2 className="section-header mb-md">Who has access</h2>

          {/* Family members */}
          <div className="mb-md">
            <h3 className="text-body font-medium mb-sm">Family members</h3>
            {accessSummary?.familyMembers.length === 0 ? (
              <p className="text-meta text-text-secondary italic">No family members</p>
            ) : (
              <div className="space-y-sm">
                {accessSummary?.familyMembers.map((member) => (
                  <div
                    key={member.userId}
                    className="flex items-center justify-between p-sm bg-bg-primary rounded-sm"
                  >
                    <div>
                      <p className="text-body">{member.name || member.email}</p>
                      <p className="text-caption text-text-secondary">{member.email}</p>
                    </div>
                    <div className="text-right">
                      <span className="px-sm py-1 text-caption bg-accent-primary/10 text-accent-primary rounded">
                        {member.role === 'OWNER_ADMIN' ? 'Admin' : member.role === 'EDITOR' ? 'Editor' : 'Viewer'}
                      </span>
                      <p className="text-caption text-text-secondary mt-xs">
                        Since {formatDate(member.joinedAt)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Clinicians */}
          <div>
            <h3 className="text-body font-medium mb-sm">Clinical team</h3>
            {accessSummary?.clinicians.length === 0 ? (
              <p className="text-meta text-text-secondary italic">No clinicians have access</p>
            ) : (
              <div className="space-y-sm">
                {accessSummary?.clinicians.map((clinician) => (
                  <div
                    key={clinician.userId}
                    className="p-sm bg-bg-primary rounded-sm"
                  >
                    <div className="flex items-start justify-between mb-sm">
                      <div>
                        <p className="text-body">{clinician.name || clinician.email}</p>
                        <p className="text-caption text-text-secondary">
                          {clinician.specialty || 'Clinician'} · {clinician.email}
                        </p>
                      </div>
                      <div className="text-right">
                        <span
                          className={`px-sm py-1 text-caption rounded ${
                            clinician.consentStatus === 'ACTIVE'
                              ? 'bg-semantic-success/10 text-semantic-success'
                              : clinician.consentStatus === 'PAUSED'
                              ? 'bg-semantic-warning/10 text-semantic-warning'
                              : 'bg-text-secondary/10 text-text-secondary'
                          }`}
                        >
                          {clinician.consentStatus}
                        </span>
                        <p className="text-caption text-text-secondary mt-xs">
                          Since {formatDate(clinician.grantedAt)}
                        </p>
                      </div>
                    </div>

                    {/* Scope access */}
                    <div>
                      <p className="text-caption text-text-secondary mb-xs">Can view:</p>
                      <div className="flex flex-wrap gap-xs">
                        {clinician.scopes.map((scope) => (
                          <span
                            key={scope.code}
                            className="px-xs py-0.5 text-caption bg-white border border-divider rounded"
                          >
                            {scope.label}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Permission Changes */}
        <section className="p-md bg-white border border-divider rounded-md">
          <h2 className="section-header mb-md">Permission changes</h2>
          {permissionChanges.length === 0 ? (
            <p className="text-meta text-text-secondary italic">No permission changes recorded</p>
          ) : (
            <div className="space-y-sm">
              {permissionChanges.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-start justify-between py-sm border-b border-divider last:border-0"
                >
                  <div>
                    <p className="text-body">
                      <span className="font-medium">{entry.actor.name || 'Someone'}</span>
                      {' '}{entry.details}
                      {entry.target && (
                        <> for <span className="font-medium">{entry.target.name || entry.target.email}</span></>
                      )}
                    </p>
                  </div>
                  <p className="text-caption text-text-secondary whitespace-nowrap ml-md">
                    {formatDate(entry.timestamp)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Document Access by Clinicians */}
        <section className="p-md bg-white border border-divider rounded-md">
          <h2 className="section-header mb-md">Document access by clinicians</h2>
          <p className="text-meta text-text-secondary mb-md">
            Track when clinicians view or download documents
          </p>
          {documentAccess.length === 0 ? (
            <p className="text-meta text-text-secondary italic">No document access by clinicians</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-meta">
                <thead>
                  <tr className="border-b border-divider">
                    <th className="text-left py-sm pr-md font-medium">Document</th>
                    <th className="text-left py-sm pr-md font-medium">Action</th>
                    <th className="text-left py-sm pr-md font-medium">By</th>
                    <th className="text-left py-sm font-medium">When</th>
                  </tr>
                </thead>
                <tbody>
                  {documentAccess.map((entry) => (
                    <tr key={entry.id} className="border-b border-divider last:border-0">
                      <td className="py-sm pr-md">{entry.documentTitle}</td>
                      <td className="py-sm pr-md">
                        <span
                          className={`px-xs py-0.5 text-caption rounded ${
                            entry.action === 'DOWNLOAD'
                              ? 'bg-semantic-warning/10 text-semantic-warning'
                              : 'bg-bg-secondary text-text-secondary'
                          }`}
                        >
                          {entry.action}
                        </span>
                      </td>
                      <td className="py-sm pr-md">{entry.accessor.name || 'Clinician'}</td>
                      <td className="py-sm text-text-secondary">{formatDate(entry.timestamp)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Export History */}
        <section className="p-md bg-white border border-divider rounded-md">
          <div className="flex items-center justify-between mb-md">
            <h2 className="section-header">Export history</h2>
            <Link
              href={`/case/${caseId}/data/export`}
              className="text-meta text-accent-primary hover:underline"
            >
              Export data →
            </Link>
          </div>
          {exportHistory.length === 0 ? (
            <p className="text-meta text-text-secondary italic">No exports yet</p>
          ) : (
            <div className="space-y-sm">
              {exportHistory.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between py-sm border-b border-divider last:border-0"
                >
                  <div>
                    <p className="text-body">
                      {entry.format.toUpperCase()} export
                      {entry.scopeFilter && entry.scopeFilter.length > 0 && (
                        <span className="text-text-secondary">
                          {' '}({entry.scopeFilter.join(', ')})
                        </span>
                      )}
                    </p>
                    <p className="text-caption text-text-secondary">
                      By {entry.requestedBy.name || 'Unknown'}
                    </p>
                  </div>
                  <div className="text-right">
                    <span
                      className={`px-sm py-1 text-caption rounded ${
                        entry.status === 'completed'
                          ? 'bg-semantic-success/10 text-semantic-success'
                          : entry.status === 'pending'
                          ? 'bg-semantic-warning/10 text-semantic-warning'
                          : 'bg-semantic-critical/10 text-semantic-critical'
                      }`}
                    >
                      {entry.status}
                    </span>
                    <p className="text-caption text-text-secondary mt-xs">
                      {formatDate(entry.requestedAt)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
