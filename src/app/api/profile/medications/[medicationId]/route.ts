import { NextResponse } from 'next/server'
import { deleteMedication, updateMedication } from '@/actions/profile'

interface RouteParams {
  params: Promise<{ medicationId: string }>
}

export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { medicationId } = await params
    const body = await request.json()
    const result = await updateMedication(medicationId, body)
    return NextResponse.json(result)
  } catch (error) {
    console.error('Failed to update medication:', error)
    return NextResponse.json({ success: false, error: 'Failed to update medication' })
  }
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  try {
    const { medicationId } = await params
    const result = await deleteMedication(medicationId)
    return NextResponse.json(result)
  } catch (error) {
    console.error('Failed to delete medication:', error)
    return NextResponse.json({ success: false, error: 'Failed to delete medication' })
  }
}

