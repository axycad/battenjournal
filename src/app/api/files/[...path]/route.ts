import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getStorage } from '@/lib/storage'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  const { path } = await params
  const storagePath = path.join('/')

  // Check if user has access to this file
  // Look up in MediaItem or Document to verify case access
  const mediaItem = await prisma.mediaItem.findFirst({
    where: { storagePath, deletedAt: null },
    include: {
      event: {
        select: { caseId: true },
      },
    },
  })

  const document = await prisma.document.findFirst({
    where: { storagePath, deletedAt: null },
  })

  const caseId = mediaItem?.event.caseId || document?.caseId

  if (!caseId) {
    return new NextResponse('Not found', { status: 404 })
  }

  // Verify user has access to this case
  const membership = await prisma.membership.findFirst({
    where: {
      caseId,
      userId: session.user.id,
      revokedAt: null,
      deletedAt: null,
    },
  })

  if (!membership) {
    return new NextResponse('Forbidden', { status: 403 })
  }

  // For clinicians, check scope access
  if (membership.memberType !== 'PARENT') {
    const grants = await prisma.permissionGrant.findMany({
      where: {
        membershipId: membership.id,
        deletedAt: null,
        consent: {
          status: 'ACTIVE',
          deletedAt: null,
        },
      },
      include: { scope: true },
    })

    const grantedScopeCodes = grants.map((g) => g.scope.code)

    // For media items, check event scopes
    if (mediaItem) {
      const eventScopes = await prisma.eventScope.findMany({
        where: { eventId: mediaItem.eventId },
        include: { scope: true },
      })

      const hasAccess = eventScopes.some((es) =>
        grantedScopeCodes.includes(es.scope.code)
      )

      if (!hasAccess) {
        return new NextResponse('Forbidden', { status: 403 })
      }
    }

    // For documents, check document scopes
    if (document) {
      const docScopes = await prisma.documentScope.findMany({
        where: { documentId: document.id },
        include: { scope: true },
      })

      const hasAccess = docScopes.some((ds) =>
        grantedScopeCodes.includes(ds.scope.code)
      )

      if (!hasAccess) {
        return new NextResponse('Forbidden', { status: 403 })
      }
    }
  }

  // Fetch and serve the file
  try {
    const storage = getStorage()
    const buffer = await storage.read(storagePath)
    const mimeType = mediaItem?.mimeType || document?.mimeType || 'application/octet-stream'
    const body = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength)

    return new NextResponse(body, {
      headers: {
        'Content-Type': mimeType,
        'Content-Length': buffer.byteLength.toString(),
        'Cache-Control': 'private, max-age=31536000',
      },
    })
  } catch {
    return new NextResponse('Not found', { status: 404 })
  }
}
