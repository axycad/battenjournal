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
    const caseId = formData.get('caseId') as string | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    if (!caseId) {
      return NextResponse.json({ error: 'Case ID required' }, { status: 400 })
    }

    const membership = await prisma.membership.findFirst({
      where: {
        caseId,
        userId: session.user.id,
        memberType: 'PARENT',
        familyRole: { in: ['OWNER_ADMIN', 'EDITOR'] },
        revokedAt: null,
        deletedAt: null,
      },
    })

    if (!membership) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
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

    await prisma.patientProfile.update({
      where: { caseId },
      data: { photoUri: result.url },
    })

    await prisma.auditEntry.create({
      data: {
        actorUserId: session.user.id,
        action: 'EDIT',
        objectType: 'PatientProfile',
        objectId: caseId,
        metadata: { action: 'update_photo' },
      },
    })

    revalidatePath(`/case/${caseId}`)
    return NextResponse.json({ success: true, url: result.url })
  } catch (error) {
    console.error('Profile photo upload error:', error)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}
