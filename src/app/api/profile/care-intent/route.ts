import { NextRequest, NextResponse } from 'next/server'
import { updateCareIntent } from '@/actions/profile'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { caseId, ...data } = body

    if (!caseId) {
      return NextResponse.json({ success: false, error: 'Case ID required' })
    }

    const result = await updateCareIntent(caseId, data)
    return NextResponse.json(result)
  } catch (error) {
    console.error('Failed to update care intent:', error)
    return NextResponse.json({ success: false, error: 'Failed to update care intent' })
  }
}

