import { NextResponse } from 'next/server'
import { deleteAllergy, updateAllergy } from '@/actions/profile'

interface RouteParams {
  params: Promise<{ allergyId: string }>
}

export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { allergyId } = await params
    const body = await request.json()
    const result = await updateAllergy(allergyId, body)
    return NextResponse.json(result)
  } catch (error) {
    console.error('Failed to update allergy:', error)
    return NextResponse.json({ success: false, error: 'Failed to update allergy' })
  }
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  try {
    const { allergyId } = await params
    const result = await deleteAllergy(allergyId)
    return NextResponse.json(result)
  } catch (error) {
    console.error('Failed to delete allergy:', error)
    return NextResponse.json({ success: false, error: 'Failed to delete allergy' })
  }
}

