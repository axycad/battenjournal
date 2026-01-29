'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui'
import {
  ClinicalNoteForm,
  ClinicalNotesList,
} from '@/components/clinical/notes'
import { FlagsList } from '@/components/clinical/flags'
import { TaskForm, TasksList } from '@/components/clinical/tasks'
import { WatchManager, WatchedUpdatesList } from '@/components/clinical/watches'
import type { ClinicalNoteWithAuthor } from '@/lib/api/clinical'
import type { FlagWithDetails } from '@/lib/api/clinical'
import type { TaskWithDetails } from '@/lib/api/tasks'
import type { WatchWithScope, WatchedUpdate } from '@/lib/api/clinical'

interface ClinicalOverviewClientProps {
  caseId: string
  notes: ClinicalNoteWithAuthor[]
  flags: FlagWithDetails[]
  tasks: TaskWithDetails[]
  watches: WatchWithScope[]
  watchedUpdates: WatchedUpdate[]
  availableScopes: { id: string; code: string; label: string }[]
  clinicians: { id: string; name: string | null }[]
  currentUserId: string
}

export function ClinicalOverviewClient({
  caseId,
  notes,
  flags,
  tasks,
  watches,
  watchedUpdates,
  availableScopes,
  clinicians,
  currentUserId,
}: ClinicalOverviewClientProps) {
  const router = useRouter()
  const [showAddNote, setShowAddNote] = useState(false)
  const [showAddTask, setShowAddTask] = useState(false)
  const [showResolvedFlags, setShowResolvedFlags] = useState(false)
  const [showCompletedTasks, setShowCompletedTasks] = useState(false)

  function handleRefresh() {
    router.refresh()
  }

  return (
    <div className="space-y-lg">
      {/* Watched updates */}
      <section className="p-md bg-white border border-divider rounded-md">
        <div className="flex items-center justify-between mb-md">
          <h2 className="section-header">Watched updates</h2>
        </div>
        <WatchedUpdatesList updates={watchedUpdates} caseId={caseId} />
      </section>

      {/* Case notes */}
      <section className="p-md bg-white border border-divider rounded-md">
        <div className="flex items-center justify-between mb-md">
          <h2 className="section-header">Case notes</h2>
          <Button
            variant="text"
            onClick={() => setShowAddNote(!showAddNote)}
            className="h-auto px-0"
          >
            {showAddNote ? 'Cancel' : '+ Add note'}
          </Button>
        </div>

        {showAddNote && (
          <div className="mb-md pb-md border-b border-divider">
            <ClinicalNoteForm
              caseId={caseId}
              onCreated={() => {
                setShowAddNote(false)
                handleRefresh()
              }}
            />
          </div>
        )}

        <ClinicalNotesList
          notes={notes}
          currentUserId={currentUserId}
          onUpdate={handleRefresh}
        />
      </section>

      {/* Flags */}
      <section className="p-md bg-white border border-divider rounded-md">
        <div className="flex items-center justify-between mb-md">
          <h2 className="section-header">Flags</h2>
          <label className="flex items-center gap-xs text-meta text-text-secondary cursor-pointer">
            <input
              type="checkbox"
              checked={showResolvedFlags}
              onChange={(e) => setShowResolvedFlags(e.target.checked)}
              className="rounded border-divider"
            />
            Show resolved
          </label>
        </div>

        <FlagsList
          flags={flags}
          currentUserId={currentUserId}
          showResolved={showResolvedFlags}
          onUpdate={handleRefresh}
        />
      </section>

      {/* Tasks */}
      <section className="p-md bg-white border border-divider rounded-md">
        <div className="flex items-center justify-between mb-md">
          <div className="flex items-center gap-md">
            <h2 className="section-header">Tasks</h2>
            <label className="flex items-center gap-xs text-meta text-text-secondary cursor-pointer">
              <input
                type="checkbox"
                checked={showCompletedTasks}
                onChange={(e) => setShowCompletedTasks(e.target.checked)}
                className="rounded border-divider"
              />
              Show completed
            </label>
          </div>
          <Button
            variant="text"
            onClick={() => setShowAddTask(!showAddTask)}
            className="h-auto px-0"
          >
            {showAddTask ? 'Cancel' : '+ Add task'}
          </Button>
        </div>

        {showAddTask && (
          <div className="mb-md">
            <TaskForm
              caseId={caseId}
              anchorType="case"
              anchorId={caseId}
              clinicians={clinicians}
              onCreated={() => {
                setShowAddTask(false)
                handleRefresh()
              }}
              onCancel={() => setShowAddTask(false)}
            />
          </div>
        )}

        <TasksList
          tasks={tasks}
          currentUserId={currentUserId}
          clinicians={clinicians}
          showCompleted={showCompletedTasks}
          onUpdate={handleRefresh}
        />
      </section>

      {/* Watches */}
      <section className="p-md bg-white border border-divider rounded-md">
        <h2 className="section-header mb-md">Manage watches</h2>
        <WatchManager
          caseId={caseId}
          watches={watches}
          availableScopes={availableScopes}
          onUpdate={handleRefresh}
        />
      </section>
    </div>
  )
}
