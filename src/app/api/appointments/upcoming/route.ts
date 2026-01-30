import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Force this route to be dynamic
export const dynamic = 'force-dynamic'

// GET /api/appointments/upcoming - Get upcoming appointments for a case
export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const caseId = searchParams.get('caseId')
    const limit = searchParams.get('limit')

    if (!caseId) {
      return NextResponse.json(
        { error: 'Case ID required' },
        { status: 400 }
      )
    }

    // Verify access
    const membership = await prisma.membership.findFirst({
      where: {
        caseId,
        userId: session.user.id,
        revokedAt: null,
        deletedAt: null,
      },
    })

    if (!membership) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    const now = new Date()

    const appointments = await prisma.appointment.findMany({
      where: {
        caseId,
        deletedAt: null,
        scheduledAt: { gte: now },
        status: { in: ['SCHEDULED', 'RESCHEDULED'] },
      },
      include: {
        createdBy: {
          select: { id: true, name: true },
        },
      },
      orderBy: { scheduledAt: 'asc' },
      take: limit ? parseInt(limit) : 10,
    })

    const result = appointments.map((apt) => ({
      ...apt,
      reminderTimes: apt.reminderTimes ? JSON.parse(apt.reminderTimes) : null,
    }))

    return NextResponse.json(result)
  } catch (error) {
    console.error('Failed to get upcoming appointments:', error)
    return NextResponse.json(
      { error: 'Failed to get appointments' },
      { status: 500 }
    )
  }
}
