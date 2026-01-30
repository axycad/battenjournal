import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Force this route to be dynamic
export const dynamic = 'force-dynamic'

// GET /api/documents - Get documents for a case
export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const caseId = searchParams.get('caseId')

    if (!caseId) {
      return NextResponse.json(
        { error: 'Case ID required' },
        { status: 400 }
      )
    }

    // Verify access
    const membership = await prisma.membership.findFirst({
      where: {
        caseId,
        userId: session.user.id,
        revokedAt: null,
        deletedAt: null,
      },
    })

    if (!membership) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    // Get granted scopes for non-parent members
    let grantedScopeCodes: string[] | null = null

    if (membership.memberType !== 'PARENT') {
      const grants = await prisma.permissionGrant.findMany({
        where: {
          membershipId: membership.id,
          deletedAt: null,
          consent: {
            caseId,
            status: 'ACTIVE',
            deletedAt: null,
          },
        },
        include: { scope: true },
      })

      if (grants.length === 0) {
        return NextResponse.json([])
      }
      grantedScopeCodes = grants.map((g) => g.scope.code)
    }

    // Fetch documents
    const documents = await prisma.document.findMany({
      where: {
        caseId,
        deletedAt: null,
        // For clinicians, only show documents with matching scopes
        ...(grantedScopeCodes && {
          scopes: {
            some: {
              scope: {
                code: { in: grantedScopeCodes },
              },
            },
          },
        }),
      },
      include: {
        uploadedBy: {
          select: { id: true, name: true },
        },
        scopes: {
          include: { scope: true },
        },
      },
      orderBy: { uploadedAt: 'desc' },
    })

    const result = documents.map((doc) => {
      const visibleScopes = doc.scopes.map((ds) => ({
        code: ds.scope.code,
        label: ds.scope.label,
      }))

      return {
        ...doc,
        scopes: undefined,
        visibleScopes,
      }
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('Failed to get documents:', error)
    return NextResponse.json(
      { error: 'Failed to get documents' },
      { status: 500 }
    )
  }
}
