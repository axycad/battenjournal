import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getStorage, validateFile, ValidationError, isImage, isPdf } from '@/lib/storage'

// Force this route to be dynamic
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const caseId = formData.get('caseId') as string | null
    const eventId = formData.get('eventId') as string | null
    const scopeCodes = formData.get('scopeCodes') as string | null
    const title = formData.get('title') as string | null
    const kind = formData.get('kind') as string | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    if (!caseId) {
      return NextResponse.json({ error: 'Case ID required' }, { status: 400 })
    }

    // Verify user has edit access to this case
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

    // Convert File to Buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const mimeType = file.type
    const filename = file.name

    // Validate file
    try {
      validateFile(buffer, filename, mimeType)
    } catch (e) {
      if (e instanceof ValidationError) {
        return NextResponse.json({ error: e.message }, { status: 400 })
      }
      throw e
    }

    // Upload to storage
    const storage = getStorage()
    const result = await storage.upload(buffer, filename, mimeType)

    // Determine if this is media (attached to event) or document (standalone or attached)
    const isMediaAttachment = eventId && isImage(mimeType)
    const isDocumentUpload = !isMediaAttachment

    if (isMediaAttachment) {
      // Create MediaItem attached to event
      const event = await prisma.event.findFirst({
        where: { id: eventId, caseId, deletedAt: null },
      })

      if (!event) {
        return NextResponse.json({ error: 'Event not found' }, { status: 404 })
      }

      const mediaItem = await prisma.mediaItem.create({
        data: {
          eventId,
          kind: 'PHOTO',
          storagePath: result.path,
          originalFilename: filename,
          mimeType: result.mimeType,
          size: result.size,
          checksum: result.checksum,
        },
      })

      // Audit
      await prisma.auditEntry.create({
        data: {
          actorUserId: session.user.id,
          action: 'EDIT',
          objectType: 'MediaItem',
          objectId: mediaItem.id,
          metadata: { eventId, filename },
        },
      })

      return NextResponse.json({
        success: true,
        type: 'media',
        id: mediaItem.id,
        url: result.url,
      })
    }

    if (isDocumentUpload) {
      // Parse scope codes
      const parsedScopes = scopeCodes ? scopeCodes.split(',').filter(Boolean) : []

      if (parsedScopes.length === 0) {
        return NextResponse.json(
          { error: 'At least one scope is required for documents' },
          { status: 400 }
        )
      }

      // Validate document kind
      const validKinds = ['LAB_REPORT', 'CLINIC_LETTER', 'GENETIC_REPORT', 'INSURANCE', 'OTHER']
      const documentKind = kind && validKinds.includes(kind) ? kind : 'OTHER'

      // Create Document with scopes in transaction
      const document = await prisma.$transaction(async (tx) => {
        const doc = await tx.document.create({
          data: {
            caseId,
            eventId: eventId || undefined,
            kind: documentKind as 'LAB_REPORT' | 'CLINIC_LETTER' | 'GENETIC_REPORT' | 'INSURANCE' | 'OTHER',
            title: title || filename,
            storagePath: result.path,
            originalFilename: filename,
            mimeType: result.mimeType,
            size: result.size,
            checksum: result.checksum,
            uploadedByUserId: session.user.id,
          },
        })

        // Get scope IDs and create DocumentScope records
        const scopes = await tx.scope.findMany({
          where: { code: { in: parsedScopes as string[] } },
        })

        if (scopes.length > 0) {
          await tx.documentScope.createMany({
            data: scopes.map((scope) => ({
              documentId: doc.id,
              scopeId: scope.id,
            })),
          })
        }

        await tx.auditEntry.create({
          data: {
            actorUserId: session.user.id,
            action: 'EDIT',
            objectType: 'Document',
            objectId: doc.id,
            metadata: { kind: documentKind, filename, scopes: parsedScopes },
          },
        })

        return doc
      })

      return NextResponse.json({
        success: true,
        type: 'document',
        id: document.id,
        url: result.url,
      })
    }

    return NextResponse.json({ error: 'Invalid upload type' }, { status: 400 })
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json(
      { error: 'Upload failed' },
      { status: 500 }
    )
  }
}
