import { NextRequest, NextResponse } from 'next/server'
import { confirmBaselineUnchanged } from '@/actions/profile'

const DEFAULT_FIELDS = ['vision', 'mobility', 'communication', 'feeding'] as const

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { caseId } = body

    if (!caseId) {
      return NextResponse.json({ success: false, error: 'Case ID required' })
    }

    const result = await confirmBaselineUnchanged(caseId, [...DEFAULT_FIELDS])
    return NextResponse.json(result)
  } catch (error) {
    console.error('Failed to confirm baseline:', error)
    return NextResponse.json({ success: false, error: 'Failed to confirm baseline' })
  }
}

