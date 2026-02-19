import { NextResponse } from 'next/server'
import { deleteCareContact, updateCareContact } from '@/actions/profile'

interface RouteParams {
  params: Promise<{ contactId: string }>
}

export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { contactId } = await params
    const body = await request.json()
    const result = await updateCareContact(contactId, body)
    return NextResponse.json(result)
  } catch (error) {
    console.error('Failed to update contact:', error)
    return NextResponse.json({ success: false, error: 'Failed to update contact' })
  }
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  try {
    const { contactId } = await params
    const result = await deleteCareContact(contactId)
    return NextResponse.json(result)
  } catch (error) {
    console.error('Failed to delete contact:', error)
    return NextResponse.json({ success: false, error: 'Failed to delete contact' })
  }
}

