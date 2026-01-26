'use server'

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

export type ActionResult<T = void> = {
  success: boolean
  error?: string
  data?: T
}

// ============================================================================
// TYPES
// ============================================================================

export interface ThreadWithMessages {
  id: string
  caseId: string
  anchorType: 'CASE' | 'EVENT'
  anchorId: string
  subject: string | null
  createdAt: Date
  messageCount: number
  lastMessageAt: Date | null
  lastMessagePreview: string | null
  unreadCount: number
  participants: {
    id: string
    name: string | null
    memberType: string
  }[]
}

export interface MessageWithAuthor {
  id: string
  threadId: string
  messageType: 'FREE_TEXT' | 'QUESTION_CARD' | 'ANSWER'
  content: string
  createdAt: Date
  author: {
    id: string
    name: string | null
    memberType: string | null
    specialty: string | null
  }
  document: {
    id: string
    title: string
    mimeType: string
  } | null
}

export interface QuestionCardContent {
  question: string
  options?: string[]
  answered: boolean
  answeredAt?: string
  answeredBy?: string
}

// ============================================================================
// ACCESS HELPERS
// ============================================================================

async function verifyCaseAccess(caseId: string) {
  const session = await auth()
  if (!session?.user?.id) {
    return { error: 'Not authenticated', membership: null }
  }

  const membership = await prisma.membership.findFirst({
    where: {
      caseId,
      userId: session.user.id,
      revokedAt: null,
      deletedAt: null,
    },
  })

  if (!membership) {
    return { error: 'Access denied', membership: null }
  }

  // For clinicians, check consent is active
  if (membership.memberType === 'CARE_TEAM') {
    const consent = await prisma.consent.findFirst({
      where: {
        caseId,
        consentType: 'CLINICAL',
        status: 'ACTIVE',
        deletedAt: null,
        permissionGrants: {
          some: {
            membershipId: membership.id,
            deletedAt: null,
          },
        },
      },
    })

    if (!consent) {
      return { error: 'Clinical access paused or revoked', membership: null }
    }
  }

  return { error: null, membership, userId: session.user.id }
}

// ============================================================================
// THREADS
// ============================================================================

export async function createThread(input: {
  caseId: string
  anchorType: 'case' | 'event'
  anchorId: string
  subject?: string
  initialMessage: string
}): Promise<ActionResult<{ threadId: string }>> {
  const { error, membership, userId } = await verifyCaseAccess(input.caseId)
  if (error) return { success: false, error }

  const isParent = membership!.memberType === 'PARENT'

  // Only parents can create case-level threads
  if (input.anchorType === 'case' && !isParent) {
    return { success: false, error: 'Only parents can create case discussions' }
  }

  // For event threads, verify event exists and belongs to case
  if (input.anchorType === 'event') {
    const event = await prisma.event.findFirst({
      where: {
        id: input.anchorId,
        caseId: input.caseId,
        deletedAt: null,
      },
    })

    if (!event) {
      return { success: false, error: 'Event not found' }
    }
  }

  const thread = await prisma.$transaction(async (tx) => {
    const newThread = await tx.thread.create({
      data: {
        caseId: input.caseId,
        anchorType: input.anchorType.toUpperCase() as 'CASE' | 'EVENT',
        anchorId: input.anchorType === 'case' ? input.caseId : input.anchorId,
        subject: input.subject?.trim() || null,
      },
    })

    // Create initial message
    await tx.message.create({
      data: {
        threadId: newThread.id,
        authorUserId: userId!,
        messageType: 'FREE_TEXT',
        content: input.initialMessage.trim(),
      },
    })

    // Mark as read for creator
    await tx.threadRead.create({
      data: {
        threadId: newThread.id,
        userId: userId!,
      },
    })

    await tx.auditEntry.create({
      data: {
        actorUserId: userId!,
        action: 'EDIT',
        objectType: 'Thread',
        objectId: newThread.id,
        metadata: {
          anchorType: input.anchorType,
          anchorId: input.anchorId,
        },
      },
    })

    return newThread
  })

  revalidatePath(`/case/${input.caseId}`)
  return { success: true, data: { threadId: thread.id } }
}

export async function getThreadsForCase(
  caseId: string,
  options?: { anchorType?: 'case' | 'event'; anchorId?: string }
): Promise<ThreadWithMessages[]> {
  const { error, membership, userId } = await verifyCaseAccess(caseId)
  if (error || !membership) return []

  const threads = await prisma.thread.findMany({
    where: {
      caseId,
      deletedAt: null,
      ...(options?.anchorType && {
        anchorType: options.anchorType.toUpperCase() as 'CASE' | 'EVENT',
      }),
      ...(options?.anchorId && { anchorId: options.anchorId }),
    },
    include: {
      messages: {
        where: { deletedAt: null },
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: {
          content: true,
          createdAt: true,
          author: {
            select: { id: true, name: true },
          },
        },
      },
      threadReads: {
        where: { userId: userId! },
        select: { lastReadAt: true },
      },
      _count: {
        select: {
          messages: {
            where: { deletedAt: null },
          },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  // Get unique participants for each thread
  const threadIds = threads.map((t) => t.id)
  const participantsByThread = await prisma.message.groupBy({
    by: ['threadId', 'authorUserId'],
    where: {
      threadId: { in: threadIds },
      deletedAt: null,
    },
  })

  const userIds = [...new Set(participantsByThread.map((p) => p.authorUserId))]
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, name: true },
  })

  const memberships = await prisma.membership.findMany({
    where: {
      caseId,
      userId: { in: userIds },
      deletedAt: null,
    },
    select: { userId: true, memberType: true },
  })

  const userMap = new Map(users.map((u) => [u.id, u]))
  const membershipMap = new Map(memberships.map((m) => [m.userId, m.memberType]))

  return threads.map((thread) => {
    const lastMessage = thread.messages[0]
    const lastRead = thread.threadReads[0]?.lastReadAt

    // Count unread messages
    const unreadCount = lastRead
      ? prisma.message.count({
          where: {
            threadId: thread.id,
            createdAt: { gt: lastRead },
            deletedAt: null,
          },
        })
      : thread._count.messages

    // Get participants for this thread
    const threadParticipantIds = participantsByThread
      .filter((p) => p.threadId === thread.id)
      .map((p) => p.authorUserId)

    const participants = threadParticipantIds.map((uid) => ({
      id: uid,
      name: userMap.get(uid)?.name || null,
      memberType: membershipMap.get(uid) || 'UNKNOWN',
    }))

    return {
      id: thread.id,
      caseId: thread.caseId,
      anchorType: thread.anchorType,
      anchorId: thread.anchorId,
      subject: thread.subject,
      createdAt: thread.createdAt,
      messageCount: thread._count.messages,
      lastMessageAt: lastMessage?.createdAt || null,
      lastMessagePreview: lastMessage?.content?.slice(0, 100) || null,
      unreadCount: typeof unreadCount === 'number' ? unreadCount : 0,
      participants,
    }
  })
}

export async function getThread(
  threadId: string
): Promise<{ thread: ThreadWithMessages; messages: MessageWithAuthor[] } | null> {
  const session = await auth()
  if (!session?.user?.id) return null

  const thread = await prisma.thread.findUnique({
    where: { id: threadId },
    include: {
      messages: {
        where: { deletedAt: null },
        orderBy: { createdAt: 'asc' },
        include: {
          author: {
            select: { id: true, name: true },
          },
          document: {
            select: { id: true, title: true, mimeType: true },
          },
        },
      },
      threadReads: {
        where: { userId: session.user.id },
        select: { lastReadAt: true },
      },
      _count: {
        select: { messages: { where: { deletedAt: null } } },
      },
    },
  })

  if (!thread || thread.deletedAt) return null

  // Verify access
  const { error } = await verifyCaseAccess(thread.caseId)
  if (error) return null

  // Get membership info for authors
  const authorIds = [...new Set(thread.messages.map((m) => m.authorUserId))]
  const memberships = await prisma.membership.findMany({
    where: {
      caseId: thread.caseId,
      userId: { in: authorIds },
      deletedAt: null,
    },
    select: { userId: true, memberType: true, specialty: true },
  })

  const membershipMap = new Map(
    memberships.map((m) => [m.userId, { memberType: m.memberType, specialty: m.specialty }])
  )

  const messages: MessageWithAuthor[] = thread.messages.map((m) => ({
    id: m.id,
    threadId: m.threadId,
    messageType: m.messageType,
    content: m.content,
    createdAt: m.createdAt,
    author: {
      id: m.author.id,
      name: m.author.name,
      memberType: membershipMap.get(m.authorUserId)?.memberType || null,
      specialty: membershipMap.get(m.authorUserId)?.specialty || null,
    },
    document: m.document,
  }))

  // Mark as read
  await prisma.threadRead.upsert({
    where: {
      threadId_userId: {
        threadId,
        userId: session.user.id,
      },
    },
    update: { lastReadAt: new Date() },
    create: {
      threadId,
      userId: session.user.id,
    },
  })

  return {
    thread: {
      id: thread.id,
      caseId: thread.caseId,
      anchorType: thread.anchorType,
      anchorId: thread.anchorId,
      subject: thread.subject,
      createdAt: thread.createdAt,
      messageCount: thread._count.messages,
      lastMessageAt: thread.messages[thread.messages.length - 1]?.createdAt || null,
      lastMessagePreview: null,
      unreadCount: 0, // Just marked as read
      participants: [],
    },
    messages,
  }
}

// ============================================================================
// MESSAGES
// ============================================================================

export async function sendMessage(input: {
  threadId: string
  content: string
  messageType?: 'FREE_TEXT' | 'QUESTION_CARD' | 'ANSWER'
  documentId?: string
}): Promise<ActionResult<{ messageId: string }>> {
  const session = await auth()
  if (!session?.user?.id) {
    return { success: false, error: 'Not authenticated' }
  }

  const thread = await prisma.thread.findUnique({
    where: { id: input.threadId },
  })

  if (!thread || thread.deletedAt) {
    return { success: false, error: 'Thread not found' }
  }

  const { error } = await verifyCaseAccess(thread.caseId)
  if (error) return { success: false, error }

  // If attaching document, verify it exists and user has access
  if (input.documentId) {
    const document = await prisma.document.findFirst({
      where: {
        id: input.documentId,
        caseId: thread.caseId,
        deletedAt: null,
      },
    })

    if (!document) {
      return { success: false, error: 'Document not found' }
    }
  }

  const message = await prisma.$transaction(async (tx) => {
    const newMessage = await tx.message.create({
      data: {
        threadId: input.threadId,
        authorUserId: session.user.id,
        messageType: input.messageType || 'FREE_TEXT',
        content: input.content.trim(),
        documentId: input.documentId || null,
      },
    })

    // Update sender's read timestamp
    await tx.threadRead.upsert({
      where: {
        threadId_userId: {
          threadId: input.threadId,
          userId: session.user.id,
        },
      },
      update: { lastReadAt: new Date() },
      create: {
        threadId: input.threadId,
        userId: session.user.id,
      },
    })

    return newMessage
  })

  revalidatePath(`/case/${thread.caseId}`)
  return { success: true, data: { messageId: message.id } }
}

export async function sendQuestionCard(input: {
  threadId: string
  question: string
  options?: string[]
}): Promise<ActionResult<{ messageId: string }>> {
  const content: QuestionCardContent = {
    question: input.question.trim(),
    options: input.options?.map((o) => o.trim()).filter(Boolean),
    answered: false,
  }

  return sendMessage({
    threadId: input.threadId,
    content: JSON.stringify(content),
    messageType: 'QUESTION_CARD',
  })
}

export async function answerQuestionCard(input: {
  questionMessageId: string
  answer: string
}): Promise<ActionResult<{ messageId: string }>> {
  const session = await auth()
  if (!session?.user?.id) {
    return { success: false, error: 'Not authenticated' }
  }

  const questionMessage = await prisma.message.findUnique({
    where: { id: input.questionMessageId },
    include: { thread: true },
  })

  if (!questionMessage || questionMessage.deletedAt) {
    return { success: false, error: 'Question not found' }
  }

  if (questionMessage.messageType !== 'QUESTION_CARD') {
    return { success: false, error: 'Not a question card' }
  }

  const { error } = await verifyCaseAccess(questionMessage.thread.caseId)
  if (error) return { success: false, error }

  // Parse and update the question card
  let questionContent: QuestionCardContent
  try {
    questionContent = JSON.parse(questionMessage.content)
  } catch {
    return { success: false, error: 'Invalid question format' }
  }

  if (questionContent.answered) {
    return { success: false, error: 'Question already answered' }
  }

  // Update the question card
  questionContent.answered = true
  questionContent.answeredAt = new Date().toISOString()
  questionContent.answeredBy = session.user.id

  await prisma.$transaction(async (tx) => {
    // Update the question message
    await tx.message.update({
      where: { id: input.questionMessageId },
      data: { content: JSON.stringify(questionContent) },
    })

    // Create the answer message
    await tx.message.create({
      data: {
        threadId: questionMessage.threadId,
        authorUserId: session.user.id,
        messageType: 'ANSWER',
        content: input.answer.trim(),
      },
    })

    // Update read timestamp
    await tx.threadRead.upsert({
      where: {
        threadId_userId: {
          threadId: questionMessage.threadId,
          userId: session.user.id,
        },
      },
      update: { lastReadAt: new Date() },
      create: {
        threadId: questionMessage.threadId,
        userId: session.user.id,
      },
    })
  })

  revalidatePath(`/case/${questionMessage.thread.caseId}`)
  return { success: true, data: { messageId: input.questionMessageId } }
}

export async function deleteMessage(messageId: string): Promise<ActionResult> {
  const session = await auth()
  if (!session?.user?.id) {
    return { success: false, error: 'Not authenticated' }
  }

  const message = await prisma.message.findUnique({
    where: { id: messageId },
    include: { thread: true },
  })

  if (!message || message.deletedAt) {
    return { success: false, error: 'Message not found' }
  }

  // Only author can delete their message
  if (message.authorUserId !== session.user.id) {
    return { success: false, error: 'Only the author can delete this message' }
  }

  await prisma.$transaction(async (tx) => {
    await tx.message.update({
      where: { id: messageId },
      data: { deletedAt: new Date() },
    })

    await tx.auditEntry.create({
      data: {
        actorUserId: session.user.id,
        action: 'DELETE',
        objectType: 'Message',
        objectId: messageId,
      },
    })
  })

  revalidatePath(`/case/${message.thread.caseId}`)
  return { success: true }
}

// ============================================================================
// UNREAD COUNTS
// ============================================================================

export async function getUnreadCountForCase(caseId: string): Promise<number> {
  const { error, userId } = await verifyCaseAccess(caseId)
  if (error || !userId) return 0

  // Get all threads in the case
  const threads = await prisma.thread.findMany({
    where: { caseId, deletedAt: null },
    select: { id: true },
  })

  if (threads.length === 0) return 0

  const threadIds = threads.map((t) => t.id)

  // Get user's read timestamps
  const reads = await prisma.threadRead.findMany({
    where: {
      threadId: { in: threadIds },
      userId,
    },
    select: { threadId: true, lastReadAt: true },
  })

  const readMap = new Map(reads.map((r) => [r.threadId, r.lastReadAt]))

  // Count unread messages across all threads
  let unreadCount = 0
  for (const threadId of threadIds) {
    const lastRead = readMap.get(threadId)
    const count = await prisma.message.count({
      where: {
        threadId,
        deletedAt: null,
        ...(lastRead ? { createdAt: { gt: lastRead } } : {}),
      },
    })
    unreadCount += count
  }

  return unreadCount
}

export async function markThreadAsRead(threadId: string): Promise<ActionResult> {
  const session = await auth()
  if (!session?.user?.id) {
    return { success: false, error: 'Not authenticated' }
  }

  const thread = await prisma.thread.findUnique({
    where: { id: threadId },
  })

  if (!thread || thread.deletedAt) {
    return { success: false, error: 'Thread not found' }
  }

  const { error } = await verifyCaseAccess(thread.caseId)
  if (error) return { success: false, error }

  await prisma.threadRead.upsert({
    where: {
      threadId_userId: {
        threadId,
        userId: session.user.id,
      },
    },
    update: { lastReadAt: new Date() },
    create: {
      threadId,
      userId: session.user.id,
    },
  })

  return { success: true }
}

export async function getThreadForEvent(
  caseId: string,
  eventId: string
): Promise<{ threadId: string; messageCount: number } | null> {
  const { error } = await verifyCaseAccess(caseId)
  if (error) return null

  const thread = await prisma.thread.findFirst({
    where: {
      caseId,
      anchorType: 'EVENT',
      anchorId: eventId,
      deletedAt: null,
    },
    select: {
      id: true,
      _count: {
        select: { messages: { where: { deletedAt: null } } },
      },
    },
  })

  if (!thread) return null

  return {
    threadId: thread.id,
    messageCount: thread._count.messages,
  }
}
