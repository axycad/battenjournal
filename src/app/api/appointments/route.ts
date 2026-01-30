import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Force this route to be dynamic
export const dynamic = 'force-dynamic'

// GET /api/appointments - Get all appointments for a case
export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const caseId = searchParams.get('caseId')
    const fromDate = searchParams.get('fromDate')
    const toDate = searchParams.get('toDate')
    const status = searchParams.get('status')

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

    const appointments = await prisma.appointment.findMany({
      where: {
        caseId,
        deletedAt: null,
        ...(fromDate && { scheduledAt: { gte: new Date(fromDate) } }),
        ...(toDate && { scheduledAt: { lte: new Date(toDate) } }),
        ...(status && { status: { in: status.split(',') as any } }),
      },
      include: {
        createdBy: {
          select: { id: true, name: true },
        },
      },
      orderBy: { scheduledAt: 'asc' },
    })

    const result = appointments.map((apt) => ({
      ...apt,
      reminderTimes: apt.reminderTimes ? JSON.parse(apt.reminderTimes) : null,
    }))

    return NextResponse.json(result)
  } catch (error) {
    console.error('Failed to get appointments:', error)
    return NextResponse.json(
      { error: 'Failed to get appointments' },
      { status: 500 }
    )
  }
}
