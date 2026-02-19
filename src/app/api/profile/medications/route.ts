import { NextRequest, NextResponse } from 'next/server'
import { addMedication } from '@/actions/profile'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { caseId, ...data } = body

    if (!caseId) {
      return NextResponse.json({ success: false, error: 'Case ID required' })
    }

    const result = await addMedication(caseId, data)
    return NextResponse.json(result)
  } catch (error) {
    console.error('Failed to add medication:', error)
    return NextResponse.json({ success: false, error: 'Failed to add medication' })
  }
}

