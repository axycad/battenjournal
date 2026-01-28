import {Link} from '@/navigation'
import { getCasesForUser } from '@/actions/case'
import { getMyTasks } from '@/actions/tasks'
import { getNotificationCounts, getNotificationCountsPerCase } from '@/actions/notifications'
import { Button } from '@/components/ui'
import { NotificationIndicator, CaseNotificationBadges } from '@/components/notifications'
import { formatDate } from '@/lib/utils'

export default async function DashboardPage() {
  const [cases, myTasks, notificationCounts, caseNotifications] = await Promise.all([
    getCasesForUser(),
    getMyTasks(),
    getNotificationCounts(),
    getNotificationCountsPerCase(),
  ])

  const hasClinicalAccess = cases.some((c) => c.memberType === 'CARE_TEAM')
  const hasParentAccess = cases.some((c) => c.memberType === 'PARENT')

  // Create a map of case notifications for easy lookup
  const notificationMap = new Map(
    caseNotifications.map((cn) => [cn.caseId, cn])
  )

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50/30 via-white to-pink-50/30">
      <div className="max-w-4xl mx-auto px-md py-lg">
        {/* Header */}
        <div className="mb-xl">
          <div className="flex items-center justify-between mb-md">
            <div>
              <h1 className="text-h1 font-bold text-text-primary mb-xs">
                {hasParentAccess ? 'Your care journal' : 'Your patients'}
              </h1>
              <p className="text-body text-text-secondary">
                {hasParentAccess
                  ? 'Track, share, and find patterns in your child\'s care'
                  : 'Access patient records and clinical notes'}
              </p>
            </div>
            <div className="flex items-center gap-sm">
              <NotificationIndicator counts={notificationCounts} />
              <Link href="/settings">
                <Button variant="secondary">Settings</Button>
              </Link>
            </div>
          </div>
        </div>

        {/* My Tasks - for clinicians */}
        {hasClinicalAccess && myTasks.length > 0 && (
          <div className="mb-lg">
            <div className="bg-white rounded-lg border border-divider p-md shadow-sm">
              <h2 className="text-h3 font-semibold text-text-primary mb-md">
                My tasks
              </h2>
              <div className="space-y-xs">
                {myTasks.slice(0, 5).map((task) => (
                  <Link
                    key={task.id}
                    href={`/case/${task.caseId}/clinical`}
                    className="block p-sm bg-purple-50/50 border border-purple-100 rounded-md hover:border-purple-300 hover:bg-purple-50 transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-body font-medium">{task.title}</span>
                      <span className="text-meta text-text-secondary">
                        {task.caseName}
                      </span>
                    </div>
                    {task.dueAt && (
                      <p className="text-caption text-text-secondary mt-xs">
                        Due {formatDate(task.dueAt)}
                      </p>
                    )}
                  </Link>
                ))}
                {myTasks.length > 5 && (
                  <p className="text-caption text-text-secondary text-center pt-sm">
                    +{myTasks.length - 5} more tasks
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Cases grid */}
        <div>
          <div className="flex items-center justify-between mb-md">
            <h2 className="text-h3 font-semibold text-text-primary">
              {hasParentAccess ? 'Children' : 'Patients'}
            </h2>
            {hasParentAccess && (
              <Link href="/case/new">
                <Button className="bg-gradient-to-r from-purple-600 to-pink-600 hover:shadow-lg">
                  + Add child
                </Button>
              </Link>
            )}
          </div>

          {cases.length === 0 ? (
            <div className="bg-white rounded-lg border border-divider p-xl text-center shadow-sm">
              <div className="max-w-md mx-auto">
                <div className="w-16 h-16 bg-gradient-to-br from-purple-100 to-pink-100 rounded-full flex items-center justify-center mx-auto mb-md">
                  <span className="text-3xl">📖</span>
                </div>
                <h3 className="text-title-lg font-semibold text-text-primary mb-xs">
                  Start your care journal
                </h3>
                <p className="text-body text-text-secondary mb-lg">
                  Add your child's profile to begin tracking observations, medications, and appointments.
                </p>
                <Link href="/case/new">
                  <Button className="bg-gradient-to-r from-purple-600 to-pink-600 hover:shadow-lg">
                    Add your first child
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            <div className="grid gap-md md:grid-cols-2">
              {cases.map((c) => {
                const caseNotifs = notificationMap.get(c.caseId)

                return (
                  <Link
                    key={c.caseId}
                    href={`/case/${c.caseId}`}
                    className="block p-lg bg-white border-2 border-divider rounded-lg hover:border-purple-300 hover:shadow-md transition-all group"
                  >
                    <div className="flex items-start justify-between mb-sm">
                      <div className="flex-1">
                        <div className="flex items-center gap-sm mb-xs">
                          <h3 className="text-title-lg font-semibold text-text-primary group-hover:text-purple-700 transition-colors">
                            {c.childDisplayName}
                          </h3>
                          {caseNotifs && (
                            <CaseNotificationBadges counts={caseNotifs} />
                          )}
                        </div>
                        <p className="text-meta text-text-secondary">
                          {c.memberType === 'CARE_TEAM' ? (
                            'Clinical access'
                          ) : (
                            <>
                              {c.eventCount} observations · {c.memberCount} team members
                            </>
                          )}
                        </p>
                      </div>
                      <span className="px-sm py-xxs bg-purple-50 text-purple-700 rounded-full text-caption font-medium">
                        {c.memberType === 'CARE_TEAM'
                          ? 'Clinician'
                          : c.familyRole === 'OWNER_ADMIN'
                          ? 'Admin'
                          : c.familyRole === 'EDITOR'
                          ? 'Editor'
                          : 'Viewer'}
                      </span>
                    </div>

                    {/* Quick stats */}
                    {c.memberType === 'PARENT' && (
                      <div className="pt-sm border-t border-divider mt-sm">
                        <div className="flex gap-md text-caption text-text-secondary">
                          <span>📝 {c.eventCount} logs</span>
                          <span>👥 {c.memberCount} members</span>
                        </div>
                      </div>
                    )}
                  </Link>
                )
              })}
            </div>
          )}
        </div>

        {/* Help section */}
        <div className="mt-xl bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-md border border-purple-100">
          <p className="text-meta text-text-secondary text-center">
            Need help? Visit our{' '}
            <a href="#" className="text-purple-600 hover:text-purple-700 hover:underline font-medium">
              support center
            </a>{' '}
            or{' '}
            <a href="#" className="text-purple-600 hover:text-purple-700 hover:underline font-medium">
              contact us
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
