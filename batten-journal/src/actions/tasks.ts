'use server'

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

export type ActionResult<T = void> = {
  success: boolean
  error?: string
  data?: T
}

export type TaskStatus = 'OPEN' | 'IN_PROGRESS' | 'DONE' | 'CANCELED'

export interface TaskWithDetails {
  id: string
  title: string
  description: string | null
  status: TaskStatus
  dueAt: Date | null
  createdAt: Date
  completedAt: Date | null
  anchorType: string
  anchorId: string
  createdBy: {
    id: string
    name: string | null
  }
  assignedTo: {
    id: string
    name: string | null
  } | null
}

export interface TaskWithCase extends TaskWithDetails {
  caseName: string
  caseId: string
}

// ============================================================================
// ACCESS HELPERS
// ============================================================================

async function verifyClinicalAccess(caseId: string) {
  const session = await auth()
  if (!session?.user?.id) {
    return { error: 'Not authenticated', membership: null }
  }

  const membership = await prisma.membership.findFirst({
    where: {
      caseId,
      userId: session.user.id,
      memberType: 'CARE_TEAM',
      revokedAt: null,
      deletedAt: null,
    },
  })

  if (!membership) {
    return { error: 'Clinician access required', membership: null }
  }

  // Check consent is active
  const consent = await prisma.consent.findFirst({
    where: {
      caseId,
      consentType: 'CLINICAL',
      status: 'ACTIVE',
      deletedAt: null,
      permissionGrants: {
        some: {
          membershipId: membership.id,
          deletedAt: null,
        },
      },
    },
  })

  if (!consent) {
    return { error: 'Clinical access paused or revoked', membership: null }
  }

  return { error: null, membership, userId: session.user.id }
}

// ============================================================================
// TASKS
// ============================================================================

export async function createTask(input: {
  caseId: string
  title: string
  description?: string
  anchorType: 'event' | 'case'
  anchorId: string
  assignedToId?: string
  dueAt?: string
}): Promise<ActionResult<{ taskId: string }>> {
  const { error, userId } = await verifyClinicalAccess(input.caseId)
  if (error) return { success: false, error }

  if (!input.title?.trim()) {
    return { success: false, error: 'Title is required' }
  }

  // If assigning to someone, verify they're a clinician on this case
  if (input.assignedToId) {
    const assigneeMembership = await prisma.membership.findFirst({
      where: {
        caseId: input.caseId,
        userId: input.assignedToId,
        memberType: 'CARE_TEAM',
        revokedAt: null,
        deletedAt: null,
      },
    })

    if (!assigneeMembership) {
      return { success: false, error: 'Assignee must be a clinician on this case' }
    }
  }

  const task = await prisma.$transaction(async (tx) => {
    const newTask = await tx.task.create({
      data: {
        caseId: input.caseId,
        anchorType: input.anchorType.toUpperCase() as 'EVENT' | 'CASE',
        anchorId: input.anchorId,
        createdById: userId!,
        assignedToId: input.assignedToId || null,
        title: input.title.trim(),
        description: input.description?.trim() || null,
        dueAt: input.dueAt ? new Date(input.dueAt) : null,
      },
    })

    await tx.auditEntry.create({
      data: {
        actorUserId: userId!,
        action: 'EDIT',
        objectType: 'Task',
        objectId: newTask.id,
        metadata: {
          title: input.title,
          assignedToId: input.assignedToId,
        },
      },
    })

    return newTask
  })

  revalidatePath(`/case/${input.caseId}`)
  return { success: true, data: { taskId: task.id } }
}

export async function updateTask(
  taskId: string,
  input: {
    title?: string
    description?: string
    status?: TaskStatus
    assignedToId?: string | null
    dueAt?: string | null
  }
): Promise<ActionResult> {
  const session = await auth()
  if (!session?.user?.id) {
    return { success: false, error: 'Not authenticated' }
  }

  const task = await prisma.task.findUnique({
    where: { id: taskId },
  })

  if (!task || task.deletedAt) {
    return { success: false, error: 'Task not found' }
  }

  const { error } = await verifyClinicalAccess(task.caseId)
  if (error) return { success: false, error }

  // If reassigning, verify new assignee
  if (input.assignedToId) {
    const assigneeMembership = await prisma.membership.findFirst({
      where: {
        caseId: task.caseId,
        userId: input.assignedToId,
        memberType: 'CARE_TEAM',
        revokedAt: null,
        deletedAt: null,
      },
    })

    if (!assigneeMembership) {
      return { success: false, error: 'Assignee must be a clinician on this case' }
    }
  }

  await prisma.$transaction(async (tx) => {
    await tx.task.update({
      where: { id: taskId },
      data: {
        title: input.title?.trim(),
        description: input.description !== undefined ? input.description?.trim() || null : undefined,
        status: input.status,
        assignedToId: input.assignedToId !== undefined ? input.assignedToId : undefined,
        dueAt: input.dueAt !== undefined
          ? input.dueAt ? new Date(input.dueAt) : null
          : undefined,
        completedAt: input.status === 'DONE'
          ? new Date()
          : input.status === 'OPEN' || input.status === 'IN_PROGRESS'
          ? null
          : undefined,
      },
    })

    await tx.auditEntry.create({
      data: {
        actorUserId: session.user.id,
        action: 'EDIT',
        objectType: 'Task',
        objectId: taskId,
        metadata: { updates: input },
      },
    })
  })

  revalidatePath(`/case/${task.caseId}`)
  return { success: true }
}

export async function deleteTask(taskId: string): Promise<ActionResult> {
  const session = await auth()
  if (!session?.user?.id) {
    return { success: false, error: 'Not authenticated' }
  }

  const task = await prisma.task.findUnique({
    where: { id: taskId },
  })

  if (!task || task.deletedAt) {
    return { success: false, error: 'Task not found' }
  }

  // Only creator can delete
  if (task.createdById !== session.user.id) {
    return { success: false, error: 'Only the creator can delete this task' }
  }

  await prisma.$transaction(async (tx) => {
    await tx.task.update({
      where: { id: taskId },
      data: { deletedAt: new Date() },
    })

    await tx.auditEntry.create({
      data: {
        actorUserId: session.user.id,
        action: 'DELETE',
        objectType: 'Task',
        objectId: taskId,
      },
    })
  })

  revalidatePath(`/case/${task.caseId}`)
  return { success: true }
}

export async function getTasksForCase(
  caseId: string,
  options?: { assignedToMe?: boolean; includeCompleted?: boolean }
): Promise<TaskWithDetails[]> {
  const { error, userId } = await verifyClinicalAccess(caseId)
  if (error) return []

  const tasks = await prisma.task.findMany({
    where: {
      caseId,
      deletedAt: null,
      ...(options?.assignedToMe && { assignedToId: userId }),
      ...(options?.includeCompleted ? {} : { status: { notIn: ['DONE', 'CANCELED'] } }),
    },
    include: {
      createdBy: { select: { id: true, name: true } },
      assignedTo: { select: { id: true, name: true } },
    },
    orderBy: [
      { status: 'asc' },
      { dueAt: 'asc' },
      { createdAt: 'desc' },
    ],
  })

  return tasks.map((t) => ({
    id: t.id,
    title: t.title,
    description: t.description,
    status: t.status,
    dueAt: t.dueAt,
    createdAt: t.createdAt,
    completedAt: t.completedAt,
    anchorType: t.anchorType,
    anchorId: t.anchorId,
    createdBy: t.createdBy,
    assignedTo: t.assignedTo,
  }))
}

export async function getMyTasks(): Promise<TaskWithCase[]> {
  const session = await auth()
  if (!session?.user?.id) return []

  const tasks = await prisma.task.findMany({
    where: {
      assignedToId: session.user.id,
      deletedAt: null,
      status: { notIn: ['DONE', 'CANCELED'] },
    },
    include: {
      case: { select: { id: true, childDisplayName: true } },
      createdBy: { select: { id: true, name: true } },
      assignedTo: { select: { id: true, name: true } },
    },
    orderBy: [
      { dueAt: 'asc' },
      { createdAt: 'desc' },
    ],
  })

  return tasks.map((t) => ({
    id: t.id,
    title: t.title,
    description: t.description,
    status: t.status,
    dueAt: t.dueAt,
    createdAt: t.createdAt,
    completedAt: t.completedAt,
    anchorType: t.anchorType,
    anchorId: t.anchorId,
    createdBy: t.createdBy,
    assignedTo: t.assignedTo,
    caseName: t.case.childDisplayName,
    caseId: t.case.id,
  }))
}

export async function getCliniciansForCase(
  caseId: string
): Promise<{ id: string; name: string | null }[]> {
  const clinicians = await prisma.membership.findMany({
    where: {
      caseId,
      memberType: 'CARE_TEAM',
      revokedAt: null,
      deletedAt: null,
    },
    include: {
      user: { select: { id: true, name: true } },
    },
  })

  return clinicians.map((c) => ({
    id: c.user.id,
    name: c.user.name,
  }))
}
