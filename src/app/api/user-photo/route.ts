import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getStorage, validateFile, ValidationError, isImage } from '@/lib/storage'
import { revalidatePath } from 'next/cache'

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const mimeType = file.type
    const filename = file.name

    try {
      validateFile(buffer, filename, mimeType)
    } catch (e) {
      if (e instanceof ValidationError) {
        return NextResponse.json({ error: e.message }, { status: 400 })
      }
      throw e
    }

    if (!isImage(mimeType)) {
      return NextResponse.json({ error: 'Only image files are allowed' }, { status: 400 })
    }

    const storage = getStorage()
    const result = await storage.upload(buffer, filename, mimeType)

    await prisma.user.update({
      where: { id: session.user.id },
      data: { image: result.url },
    })

    await prisma.auditEntry.create({
      data: {
        actorUserId: session.user.id,
        action: 'EDIT',
        objectType: 'User',
        objectId: session.user.id,
        metadata: { action: 'update_photo' },
      },
    })

    revalidatePath('/settings')
    return NextResponse.json({ success: true, url: result.url })
  } catch (error) {
    console.error('User photo upload error:', error)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}
