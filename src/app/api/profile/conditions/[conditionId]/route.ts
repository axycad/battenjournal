import { NextResponse } from 'next/server'
import { deleteCondition, updateCondition } from '@/actions/profile'

interface RouteParams {
  params: Promise<{ conditionId: string }>
}

export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { conditionId } = await params
    const body = await request.json()
    const result = await updateCondition(conditionId, body)
    return NextResponse.json(result)
  } catch (error) {
    console.error('Failed to update condition:', error)
    return NextResponse.json({ success: false, error: 'Failed to update condition' })
  }
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  try {
    const { conditionId } = await params
    const result = await deleteCondition(conditionId)
    return NextResponse.json(result)
  } catch (error) {
    console.error('Failed to delete condition:', error)
    return NextResponse.json({ success: false, error: 'Failed to delete condition' })
  }
}

