import Link from 'next/link'
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
    <div className="max-w-3xl mx-auto px-md py-lg">
      {/* My Tasks - for clinicians */}
      {hasClinicalAccess && myTasks.length > 0 && (
        <div className="mb-lg">
          <h2 className="section-header mb-sm">My tasks</h2>
          <div className="space-y-xs">
            {myTasks.slice(0, 5).map((task) => (
              <Link
                key={task.id}
                href={`/case/${task.caseId}/clinical`}
                className="block p-sm bg-white border border-divider rounded-sm hover:border-accent-primary transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span className="text-body">{task.title}</span>
                  <span className="text-caption text-text-secondary">
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
              <p className="text-caption text-text-secondary">
                +{myTasks.length - 5} more tasks
              </p>
            )}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-lg">
        <h1 className="screen-title">
          {hasParentAccess ? 'Your children' : 'Your patients'}
        </h1>
        <div className="flex items-center gap-sm">
          <NotificationIndicator counts={notificationCounts} />
          <Link href="/settings/sync">
            <Button variant="secondary">Settings</Button>
          </Link>
          {hasParentAccess && (
            <Link href="/case/new">
              <Button>Add child</Button>
            </Link>
          )}
        </div>
      </div>

      {cases.length === 0 ? (
        <div className="text-center py-xl">
          <p className="text-body text-text-secondary mb-md">
            No children added yet
          </p>
          <Link href="/case/new">
            <Button>Add your first child</Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-sm">
          {cases.map((c) => {
            const caseNotifs = notificationMap.get(c.caseId)

            return (
              <Link
                key={c.caseId}
                href={`/case/${c.caseId}`}
                className="block p-md bg-white border border-divider rounded-md hover:border-accent-primary transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-sm">
                      <h2 className="text-title-md font-medium">
                        {c.childDisplayName}
                      </h2>
                      {caseNotifs && (
                        <CaseNotificationBadges counts={caseNotifs} />
                      )}
                    </div>
                    <p className="text-meta text-text-secondary mt-xs">
                      {c.memberType === 'CARE_TEAM' ? (
                        'Clinical access'
                      ) : (
                        <>
                          {c.eventCount} entries · {c.memberCount} family members
                        </>
                      )}
                    </p>
                  </div>
                  <span className="text-caption text-text-secondary">
                    {c.memberType === 'CARE_TEAM'
                      ? 'Clinician'
                      : c.familyRole === 'OWNER_ADMIN'
                      ? 'Admin'
                      : c.familyRole === 'EDITOR'
                      ? 'Editor'
                      : 'Viewer'}
                  </span>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
