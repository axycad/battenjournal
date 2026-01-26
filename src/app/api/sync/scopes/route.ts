import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET - Fetch all scopes for offline caching
export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const scopes = await prisma.scope.findMany({
    select: {
      id: true,
      code: true,
      label: true,
    },
  })

  return NextResponse.json(scopes)
}
