import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json([], { status: 200 })
  }

  try {
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

    const result = tasks.map((t) => ({
      id: t.id,
      caseId: t.case.id,
      title: t.title,
      description: t.description,
      status: t.status,
      dueAt: t.dueAt,
      createdAt: t.createdAt,
      completedAt: t.completedAt,
      completed: t.status === 'DONE',
      updatedAt: t.updatedAt,
      anchorType: t.anchorType,
      anchorId: t.anchorId,
      createdBy: t.createdBy,
      assignedTo: t.assignedTo,
      caseName: t.case.childDisplayName,
    }))

    return NextResponse.json(result)
  } catch (error) {
    console.error('Failed to get my tasks:', error)
    return NextResponse.json(
      { error: 'Failed to get tasks' },
      { status: 500 }
    )
  }
}
