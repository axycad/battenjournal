import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/scopes - Get all scopes (no auth required, public data)
export async function GET() {
  try {
    const scopes = await prisma.scope.findMany({
      orderBy: { code: 'asc' },
    })

    return NextResponse.json(scopes)
  } catch (error) {
    console.error('Failed to get scopes:', error)
    return NextResponse.json(
      { error: 'Failed to get scopes' },
      { status: 500 }
    )
  }
}
