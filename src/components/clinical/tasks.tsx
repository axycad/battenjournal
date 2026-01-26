'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button, Input, Textarea, Select } from '@/components/ui'
import {
  createTask,
  updateTask,
  deleteTask,
  type TaskStatus,
  type TaskWithDetails,
} from '@/actions/tasks'
import { formatDate } from '@/lib/utils'

const STATUS_OPTIONS: { value: TaskStatus; label: string }[] = [
  { value: 'OPEN', label: 'Open' },
  { value: 'IN_PROGRESS', label: 'In progress' },
  { value: 'DONE', label: 'Done' },
  { value: 'CANCELED', label: 'Canceled' },
]

interface TaskFormProps {
  caseId: string
  anchorType: 'event' | 'case'
  anchorId: string
  clinicians: { id: string; name: string | null }[]
  onCreated?: () => void
  onCancel?: () => void
}

export function TaskForm({
  caseId,
  anchorType,
  anchorId,
  clinicians,
  onCreated,
  onCancel,
}: TaskFormProps) {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [assignedToId, setAssignedToId] = useState('')
  const [dueAt, setDueAt] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit() {
    if (!title.trim()) {
      setError('Title is required')
      return
    }

    setSaving(true)
    setError('')

    const result = await createTask({
      caseId,
      title: title.trim(),
      description: description.trim() || undefined,
      anchorType,
      anchorId,
      assignedToId: assignedToId || undefined,
      dueAt: dueAt || undefined,
    })

    if (!result.success) {
      setError(result.error || 'Failed to create task')
    } else {
      setTitle('')
      setDescription('')
      setAssignedToId('')
      setDueAt('')
      router.refresh()
      onCreated?.()
    }

    setSaving(false)
  }

  return (
    <div className="space-y-sm p-md bg-bg-primary rounded-md">
      <h3 className="text-body font-medium">New task</h3>

      <Input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Task title"
        autoFocus
      />

      <Textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Description (optional)"
        rows={2}
      />

      <div className="grid grid-cols-2 gap-sm">
        <Select
          label="Assign to"
          value={assignedToId}
          onChange={(e) => setAssignedToId(e.target.value)}
          options={[
            { value: '', label: 'Unassigned' },
            ...clinicians.map((c) => ({
              value: c.id,
              label: c.name || 'Clinician',
            })),
          ]}
        />

        <div>
          <label className="block text-meta text-text-secondary mb-xs">Due date</label>
          <input
            type="date"
            value={dueAt}
            onChange={(e) => setDueAt(e.target.value)}
            className="w-full px-sm py-2 text-body border border-divider rounded-sm bg-white"
          />
        </div>
      </div>

      {error && <p className="text-caption text-semantic-critical">{error}</p>}

      <div className="flex gap-sm">
        {onCancel && (
          <Button variant="secondary" onClick={onCancel} disabled={saving}>
            Cancel
          </Button>
        )}
        <Button onClick={handleSubmit} loading={saving}>
          Create task
        </Button>
      </div>
    </div>
  )
}

interface TaskCardProps {
  task: TaskWithDetails
  currentUserId: string
  clinicians?: { id: string; name: string | null }[]
  onUpdate?: () => void
}

export function TaskCard({ task, currentUserId, clinicians, onUpdate }: TaskCardProps) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [title, setTitle] = useState(task.title)
  const [description, setDescription] = useState(task.description || '')
  const [status, setStatus] = useState<TaskStatus>(task.status)
  const [assignedToId, setAssignedToId] = useState(task.assignedTo?.id || '')
  const [dueAt, setDueAt] = useState(
    task.dueAt ? new Date(task.dueAt).toISOString().split('T')[0] : ''
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const isOverdue =
    task.dueAt &&
    task.status !== 'DONE' &&
    task.status !== 'CANCELED' &&
    new Date(task.dueAt) < new Date()

  async function handleSave() {
    setSaving(true)
    setError('')

    const result = await updateTask(task.id, {
      title: title.trim(),
      description: description.trim() || undefined,
      status,
      assignedToId: assignedToId || null,
      dueAt: dueAt || null,
    })

    if (!result.success) {
      setError(result.error || 'Failed to update')
    } else {
      setEditing(false)
      router.refresh()
      onUpdate?.()
    }

    setSaving(false)
  }

  async function handleDelete() {
    setSaving(true)
    await deleteTask(task.id)
    setSaving(false)
    router.refresh()
    onUpdate?.()
  }

  async function handleMarkDone() {
    setSaving(true)
    await updateTask(task.id, { status: 'DONE' })
    setSaving(false)
    router.refresh()
    onUpdate?.()
  }

  if (deleting) {
    return (
      <div className="p-sm bg-bg-primary rounded-sm">
        <p className="text-meta mb-sm">Delete "{task.title}"?</p>
        {error && <p className="text-caption text-semantic-critical mb-sm">{error}</p>}
        <div className="flex gap-sm">
          <Button
            variant="secondary"
            onClick={() => setDeleting(false)}
            disabled={saving}
            className="h-auto py-1"
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            loading={saving}
            className="h-auto py-1"
          >
            Delete
          </Button>
        </div>
      </div>
    )
  }

  if (editing) {
    return (
      <div className="p-sm bg-bg-primary rounded-sm space-y-sm">
        <Input value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />

        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Description"
          rows={2}
        />

        <div className="grid grid-cols-3 gap-sm">
          <Select
            label="Status"
            value={status}
            onChange={(e) => setStatus(e.target.value as TaskStatus)}
            options={STATUS_OPTIONS}
          />

          {clinicians && (
            <Select
              label="Assigned to"
              value={assignedToId}
              onChange={(e) => setAssignedToId(e.target.value)}
              options={[
                { value: '', label: 'Unassigned' },
                ...clinicians.map((c) => ({
                  value: c.id,
                  label: c.name || 'Clinician',
                })),
              ]}
            />
          )}

          <div>
            <label className="block text-meta text-text-secondary mb-xs">Due</label>
            <input
              type="date"
              value={dueAt}
              onChange={(e) => setDueAt(e.target.value)}
              className="w-full px-sm py-2 text-body border border-divider rounded-sm bg-white"
            />
          </div>
        </div>

        {error && <p className="text-caption text-semantic-critical">{error}</p>}

        <div className="flex gap-sm">
          <Button
            variant="secondary"
            onClick={() => {
              setEditing(false)
              setTitle(task.title)
              setDescription(task.description || '')
              setStatus(task.status)
              setAssignedToId(task.assignedTo?.id || '')
              setDueAt(task.dueAt ? new Date(task.dueAt).toISOString().split('T')[0] : '')
            }}
            disabled={saving}
            className="h-auto py-1"
          >
            Cancel
          </Button>
          <Button onClick={handleSave} loading={saving} className="h-auto py-1">
            Save
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div
      className={`p-sm rounded-sm border ${
        task.status === 'DONE'
          ? 'bg-bg-primary border-divider opacity-60'
          : isOverdue
          ? 'bg-semantic-critical/5 border-semantic-critical/30'
          : 'bg-bg-primary border-divider'
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-sm">
            <span className={`text-body ${task.status === 'DONE' ? 'line-through' : ''}`}>
              {task.title}
            </span>
            <span
              className={`px-xs py-0.5 text-caption rounded ${
                task.status === 'OPEN'
                  ? 'bg-bg-secondary text-text-secondary'
                  : task.status === 'IN_PROGRESS'
                  ? 'bg-accent-primary/10 text-accent-primary'
                  : task.status === 'DONE'
                  ? 'bg-semantic-success/10 text-semantic-success'
                  : 'bg-text-secondary/10 text-text-secondary'
              }`}
            >
              {STATUS_OPTIONS.find((s) => s.value === task.status)?.label}
            </span>
          </div>

          {task.description && (
            <p className="text-meta text-text-secondary mt-xs">{task.description}</p>
          )}

          <div className="flex items-center gap-sm mt-xs text-caption text-text-secondary">
            {task.assignedTo && <span>→ {task.assignedTo.name}</span>}
            {task.dueAt && (
              <span className={isOverdue ? 'text-semantic-critical' : ''}>
                Due {formatDate(task.dueAt)}
              </span>
            )}
            <span>by {task.createdBy.name}</span>
          </div>
        </div>

        <div className="flex items-center gap-xs ml-sm">
          {task.status !== 'DONE' && (
            <button
              onClick={handleMarkDone}
              disabled={saving}
              className="text-caption text-semantic-success hover:underline disabled:opacity-50"
            >
              Done
            </button>
          )}
          <button
            onClick={() => setEditing(true)}
            className="text-caption text-text-secondary hover:text-text-primary"
          >
            Edit
          </button>
          {task.createdBy.id === currentUserId && (
            <button
              onClick={() => setDeleting(true)}
              className="text-caption text-text-secondary hover:text-semantic-critical"
            >
              Delete
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

interface TasksListProps {
  tasks: TaskWithDetails[]
  currentUserId: string
  clinicians?: { id: string; name: string | null }[]
  showCompleted?: boolean
  onUpdate?: () => void
}

export function TasksList({
  tasks,
  currentUserId,
  clinicians,
  showCompleted = false,
  onUpdate,
}: TasksListProps) {
  const visibleTasks = showCompleted
    ? tasks
    : tasks.filter((t) => t.status !== 'DONE' && t.status !== 'CANCELED')

  if (visibleTasks.length === 0) {
    return <p className="text-meta text-text-secondary italic">No tasks</p>
  }

  return (
    <div className="space-y-sm">
      {visibleTasks.map((task) => (
        <TaskCard
          key={task.id}
          task={task}
          currentUserId={currentUserId}
          clinicians={clinicians}
          onUpdate={onUpdate}
        />
      ))}
    </div>
  )
}
