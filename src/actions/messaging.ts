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
  subject: string | null
  anchorType: 'CASE' | 'EVENT'
  anchorId: string
  createdAt: Date
  messageCount: number
  unreadCount: number
  lastMessageAt: Date | null
  lastMessagePreview: string | null
  participants: {
    id: string
    name: string | null
    email: string
    role: string
    memberType: string | null
  }[]
  createdBy: {
    id: string
    name: string | null
  } | null
}

export interface MessageWithAuthor {
  id: string
  content: string
  messageType: 'FREE_TEXT' | 'QUESTION_CARD' | 'ANSWER'
  createdAt: Date
  author: {
    id: string
    name: string | null
    email: string
    memberType: string | null
    specialty: string | null
  }
  document: {
    id: string
    title: string
    mimeType: string
    storagePath: string
    originalFilename: string
  } | null
}

export interface QuestionCardContent {
  question: string
  options?: string[]
  answered?: boolean
  answerId?: string
}

export interface CaseParticipant {
  id: string
  name: string | null
  email: string
  role: string
  memberType: string
  specialty?: string | null
}

// ============================================================================
// ACCESS HELPERS
// ============================================================================

async function verifyCaseAccess(caseId: string) {
  const session = await auth()
  if (!session?.user?.id) {
    return { error: 'Not authenticated', membership: null, userId: null }
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
    return { error: 'Access denied', membership: null, userId: null }
  }

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
      return { error: 'Clinical access paused or revoked', membership: null, userId: null }
    }
  }

  return { error: null, membership, userId: session.user.id }
}

// ============================================================================
// GET AVAILABLE PARTICIPANTS FOR A CASE
// ============================================================================

export async function getCaseParticipants(caseId: string): Promise<CaseParticipant[]> {
  const { error } = await verifyCaseAccess(caseId)
  if (error) return []

  const memberships = await prisma.membership.findMany({
    where: {
      caseId,
      revokedAt: null,
      deletedAt: null,
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      },
    },
  })

  return memberships.map((m) => ({
    id: m.user.id,
    name: m.user.name,
    email: m.user.email,
    role: m.user.role,
    memberType: m.memberType,
    specialty: null,
  }))
}

// ============================================================================
// GET CASE DOCUMENTS FOR ATTACHMENT
// ============================================================================

export async function getCaseDocuments(caseId: string): Promise<{
  id: string
  title: string
  mimeType: string
}[]> {
  const { error } = await verifyCaseAccess(caseId)
  if (error) return []

  return prisma.document.findMany({
    where: {
      caseId,
      deletedAt: null,
    },
    select: {
      id: true,
      title: true,
      mimeType: true,
    },
    orderBy: { uploadedAt: 'desc' },
    take: 50,
  })
}

// ============================================================================
// GET THREADS FOR CASE
// ============================================================================

export async function getThreadsForCase(caseId: string): Promise<ThreadWithMessages[]> {
  const { error, userId } = await verifyCaseAccess(caseId)
  if (error || !userId) return []

  const threads = await prisma.thread.findMany({
    where: {
      caseId,
      deletedAt: null,
      OR: [
        { participants: { some: { userId } } },
        { createdById: userId },
        { participants: { none: {} } },
      ],
    },
    include: {
      createdBy: {
        select: { id: true, name: true },
      },
      participants: {
        include: {
          user: {
            select: { id: true, name: true, email: true, role: true },
          },
        },
      },
      messages: {
        where: { deletedAt: null },
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: {
          content: true,
          createdAt: true,
        },
      },
      threadReads: {
        where: { userId },
        select: { lastReadAt: true },
      },
      _count: {
        select: {
          messages: { where: { deletedAt: null } },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  const participantIds = Array.from(
    new Set(threads.flatMap((t) => t.participants.map((p) => p.userId)))
  )
  const membershipMap = new Map<string, string>()

  if (participantIds.length > 0) {
    const memberships = await prisma.membership.findMany({
      where: {
        caseId,
        userId: { in: participantIds },
        revokedAt: null,
        deletedAt: null,
      },
      select: { userId: true, memberType: true },
    })
    memberships.forEach((m) => membershipMap.set(m.userId, m.memberType))
  }

  return threads.map((thread) => {
    const lastRead = thread.threadReads[0]?.lastReadAt
    const lastMessage = thread.messages[0]

    let unreadCount = 0
    if (lastRead && lastMessage) {
      unreadCount = lastMessage.createdAt > lastRead ? 1 : 0
    } else if (!lastRead && thread._count.messages > 0) {
      unreadCount = thread._count.messages
    }

    return {
      id: thread.id,
      subject: thread.subject,
      anchorType: thread.anchorType,
      anchorId: thread.anchorId,
      createdAt: thread.createdAt,
      messageCount: thread._count.messages,
      unreadCount,
      lastMessageAt: lastMessage?.createdAt || null,
      lastMessagePreview: lastMessage?.content.slice(0, 100) || null,
      participants: thread.participants.map((p) => ({
        id: p.user.id,
        name: p.user.name,
        email: p.user.email,
        role: p.user.role,
        memberType: membershipMap.get(p.userId) || null,
      })),
      createdBy: thread.createdBy,
    }
  })
}

// ============================================================================
// GET THREAD WITH MESSAGES
// ============================================================================

export async function getThreadWithMessages(threadId: string): Promise<{
  thread: ThreadWithMessages
  messages: MessageWithAuthor[]
} | null> {
  const session = await auth()
  if (!session?.user?.id) return null

  const thread = await prisma.thread.findFirst({
    where: {
      id: threadId,
      deletedAt: null,
      OR: [
        { participants: { some: { userId: session.user.id } } },
        { createdById: session.user.id },
        { participants: { none: {} } },
      ],
    },
    include: {
      createdBy: {
        select: { id: true, name: true },
      },
      participants: {
        include: {
          user: {
            select: { id: true, name: true, email: true, role: true },
          },
        },
      },
      messages: {
        where: { deletedAt: null },
        orderBy: { createdAt: 'asc' },
        include: {
          author: {
            select: { id: true, name: true, email: true, role: true },
          },
          document: {
            select: {
              id: true,
              title: true,
              mimeType: true,
              storagePath: true,
              originalFilename: true,
            },
          },
        },
      },
      _count: {
        select: { messages: { where: { deletedAt: null } } },
      },
    },
  })

  if (!thread) return null

  const { error } = await verifyCaseAccess(thread.caseId)
  if (error) return null

  const authorIds = Array.from(new Set(thread.messages.map((m) => m.authorUserId)))
  const membershipMap = new Map<string, string>()

  if (authorIds.length > 0) {
    const memberships = await prisma.membership.findMany({
      where: {
        caseId: thread.caseId,
        userId: { in: authorIds },
      },
      select: { userId: true, memberType: true },
    })
    memberships.forEach((m) => membershipMap.set(m.userId, m.memberType))
  }

  await prisma.threadRead.upsert({
    where: {
      threadId_userId: { threadId, userId: session.user.id },
    },
    create: { threadId, userId: session.user.id },
    update: { lastReadAt: new Date() },
  })

  const participantMembershipMap = new Map<string, string>()
  const participantUserIds = thread.participants.map((p) => p.userId)
  if (participantUserIds.length > 0) {
    const pMemberships = await prisma.membership.findMany({
      where: {
        caseId: thread.caseId,
        userId: { in: participantUserIds },
      },
      select: { userId: true, memberType: true },
    })
    pMemberships.forEach((m) => participantMembershipMap.set(m.userId, m.memberType))
  }

  return {
    thread: {
      id: thread.id,
      subject: thread.subject,
      anchorType: thread.anchorType,
      anchorId: thread.anchorId,
      createdAt: thread.createdAt,
      messageCount: thread._count.messages,
      unreadCount: 0,
      lastMessageAt: thread.messages[thread.messages.length - 1]?.createdAt || null,
      lastMessagePreview: null,
      participants: thread.participants.map((p) => ({
        id: p.user.id,
        name: p.user.name,
        email: p.user.email,
        role: p.user.role,
        memberType: participantMembershipMap.get(p.userId) || null,
      })),
      createdBy: thread.createdBy,
    },
    messages: thread.messages.map((m) => ({
      id: m.id,
      content: m.content,
      messageType: m.messageType,
      createdAt: m.createdAt,
      author: {
        id: m.author.id,
        name: m.author.name,
        email: m.author.email,
        memberType: membershipMap.get(m.authorUserId) || null,
        specialty: null,
      },
      document: m.document,
    })),
  }
}

// ============================================================================
// CREATE THREAD
// ============================================================================

interface CreateThreadInput {
  caseId: string
  anchorType: 'case' | 'event'
  anchorId: string
  subject?: string
  initialMessage: string
  participantIds: string[]
  documentId?: string
}

export async function createThread(
  input: CreateThreadInput
): Promise<ActionResult<{ threadId: string; messageId: string }>> {
  const { error, membership, userId } = await verifyCaseAccess(input.caseId)
  if (error || !userId) return { success: false, error: error || 'Access denied' }

  if (input.participantIds.length === 0) {
    return { success: false, error: 'At least one participant is required' }
  }

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

  const participantMemberships = await prisma.membership.findMany({
    where: {
      caseId: input.caseId,
      userId: { in: input.participantIds },
      revokedAt: null,
      deletedAt: null,
    },
  })

  if (participantMemberships.length !== input.participantIds.length) {
    return { success: false, error: 'Some participants do not have access to this case' }
  }

  if (input.documentId) {
    const document = await prisma.document.findFirst({
      where: {
        id: input.documentId,
        caseId: input.caseId,
        deletedAt: null,
      },
    })

    if (!document) {
      return { success: false, error: 'Document not found' }
    }
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const thread = await tx.thread.create({
        data: {
          caseId: input.caseId,
          anchorType: input.anchorType.toUpperCase() as 'CASE' | 'EVENT',
          anchorId: input.anchorType === 'case' ? input.caseId : input.anchorId,
          subject: input.subject,
          createdById: userId,
        },
      })

      const allParticipantIds = Array.from(
        new Set([userId, ...input.participantIds])
      )

      await tx.threadParticipant.createMany({
        data: allParticipantIds.map((participantId) => ({
          threadId: thread.id,
          userId: participantId,
        })),
      })

      const message = await tx.message.create({
        data: {
          threadId: thread.id,
          authorUserId: userId,
          messageType: 'FREE_TEXT',
          content: input.initialMessage,
          documentId: input.documentId,
        },
      })

      await tx.threadRead.create({
        data: {
          threadId: thread.id,
          userId,
        },
      })

      await tx.auditEntry.create({
        data: {
          actorUserId: userId,
          action: 'EDIT',
          objectType: 'Thread',
          objectId: thread.id,
          metadata: {
            anchorType: input.anchorType,
            anchorId: input.anchorId,
          },
        },
      })

      return { threadId: thread.id, messageId: message.id }
    })

    revalidatePath(`/case/${input.caseId}/messages`)
    return { success: true, data: result }
  } catch (err) {
    console.error('Failed to create thread:', err)
    return { success: false, error: 'Failed to create discussion' }
  }
}

// ============================================================================
// SEND MESSAGE
// ============================================================================

interface SendMessageInput {
  threadId: string
  content: string
  documentId?: string
}

export async function sendMessage(
  input: SendMessageInput
): Promise<ActionResult<{ messageId: string }>> {
  const session = await auth()
  if (!session?.user?.id) {
    return { success: false, error: 'Not authenticated' }
  }

  const thread = await prisma.thread.findFirst({
    where: {
      id: input.threadId,
      deletedAt: null,
      OR: [
        { participants: { some: { userId: session.user.id } } },
        { createdById: session.user.id },
        { participants: { none: {} } },
      ],
    },
  })

  if (!thread) {
    return { success: false, error: 'Thread not found' }
  }

  const { error } = await verifyCaseAccess(thread.caseId)
  if (error) return { success: false, error }

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

  try {
    const message = await prisma.message.create({
      data: {
        threadId: input.threadId,
        authorUserId: session.user.id,
        messageType: 'FREE_TEXT',
        content: input.content,
        documentId: input.documentId,
      },
    })

    await prisma.threadRead.upsert({
      where: {
        threadId_userId: { threadId: input.threadId, userId: session.user.id },
      },
      create: { threadId: input.threadId, userId: session.user.id },
      update: { lastReadAt: new Date() },
    })

    revalidatePath(`/case/${thread.caseId}/messages`)
    return { success: true, data: { messageId: message.id } }
  } catch (err) {
    console.error('Failed to send message:', err)
    return { success: false, error: 'Failed to send message' }
  }
}

// ============================================================================
// SEND QUESTION CARD
// ============================================================================

interface SendQuestionCardInput {
  threadId: string
  question: string
  options?: string[]
}

export async function sendQuestionCard(
  input: SendQuestionCardInput
): Promise<ActionResult<{ messageId: string }>> {
  const session = await auth()
  if (!session?.user?.id) {
    return { success: false, error: 'Not authenticated' }
  }

  const thread = await prisma.thread.findFirst({
    where: {
      id: input.threadId,
      deletedAt: null,
      OR: [
        { participants: { some: { userId: session.user.id } } },
        { createdById: session.user.id },
        { participants: { none: {} } },
      ],
    },
  })

  if (!thread) {
    return { success: false, error: 'Thread not found' }
  }

  const { error } = await verifyCaseAccess(thread.caseId)
  if (error) return { success: false, error }

  try {
    const content: QuestionCardContent = {
      question: input.question,
      options: input.options,
      answered: false,
    }

    const message = await prisma.message.create({
      data: {
        threadId: input.threadId,
        authorUserId: session.user.id,
        messageType: 'QUESTION_CARD',
        content: JSON.stringify(content),
      },
    })

    revalidatePath(`/case/${thread.caseId}/messages`)
    return { success: true, data: { messageId: message.id } }
  } catch (err) {
    console.error('Failed to send question:', err)
    return { success: false, error: 'Failed to send question' }
  }
}

// ============================================================================
// ANSWER QUESTION CARD
// ============================================================================

interface AnswerQuestionCardInput {
  questionMessageId: string
  answer: string
}

export async function answerQuestionCard(
  input: AnswerQuestionCardInput
): Promise<ActionResult<{ messageId: string }>> {
  const session = await auth()
  if (!session?.user?.id) {
    return { success: false, error: 'Not authenticated' }
  }

  const questionMessage = await prisma.message.findFirst({
    where: {
      id: input.questionMessageId,
      messageType: 'QUESTION_CARD',
      deletedAt: null,
    },
    include: { thread: true },
  })

  if (!questionMessage) {
    return { success: false, error: 'Question not found' }
  }

  const { error } = await verifyCaseAccess(questionMessage.thread.caseId)
  if (error) return { success: false, error }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const answer = await tx.message.create({
        data: {
          threadId: questionMessage.threadId,
          authorUserId: session.user!.id,
          messageType: 'ANSWER',
          content: input.answer,
        },
      })

      let content: QuestionCardContent
      try {
        content = JSON.parse(questionMessage.content)
      } catch {
        content = { question: questionMessage.content }
      }
      content.answered = true
      content.answerId = answer.id

      await tx.message.update({
        where: { id: questionMessage.id },
        data: { content: JSON.stringify(content) },
      })

      return { messageId: answer.id }
    })

    revalidatePath(`/case/${questionMessage.thread.caseId}/messages`)
    return { success: true, data: result }
  } catch (err) {
    console.error('Failed to answer question:', err)
    return { success: false, error: 'Failed to submit answer' }
  }
}

// ============================================================================
// DELETE MESSAGE
// ============================================================================

export async function deleteMessage(messageId: string): Promise<ActionResult> {
  const session = await auth()
  if (!session?.user?.id) {
    return { success: false, error: 'Not authenticated' }
  }

  const message = await prisma.message.findFirst({
    where: {
      id: messageId,
      deletedAt: null,
    },
    include: { thread: true },
  })

  if (!message) {
    return { success: false, error: 'Message not found' }
  }

  if (message.authorUserId !== session.user.id) {
    return { success: false, error: 'Access denied' }
  }

  try {
    await prisma.message.update({
      where: { id: messageId },
      data: { deletedAt: new Date() },
    })

    revalidatePath(`/case/${message.thread.caseId}/messages`)
    return { success: true }
  } catch (err) {
    console.error('Failed to delete message:', err)
    return { success: false, error: 'Failed to delete message' }
  }
}

// ============================================================================
// ADD PARTICIPANT TO THREAD
// ============================================================================

export async function addThreadParticipant(
  threadId: string,
  userId: string
): Promise<ActionResult> {
  const session = await auth()
  if (!session?.user?.id) {
    return { success: false, error: 'Not authenticated' }
  }

  const thread = await prisma.thread.findFirst({
    where: {
      id: threadId,
      deletedAt: null,
      createdById: session.user.id,
    },
  })

  if (!thread) {
    return { success: false, error: 'Thread not found or not authorized' }
  }

  const membership = await prisma.membership.findFirst({
    where: {
      caseId: thread.caseId,
      userId,
      revokedAt: null,
      deletedAt: null,
    },
  })

  if (!membership) {
    return { success: false, error: 'User does not have access to this case' }
  }

  try {
    await prisma.threadParticipant.create({
      data: { threadId, userId },
    })

    revalidatePath(`/case/${thread.caseId}/messages`)
    return { success: true }
  } catch {
    return { success: true }
  }
}

// ============================================================================
// UNREAD COUNTS
// ============================================================================

export async function getUnreadCountForCase(caseId: string): Promise<number> {
  const { error, userId } = await verifyCaseAccess(caseId)
  if (error || !userId) return 0

  const threads = await prisma.thread.findMany({
    where: {
      caseId,
      deletedAt: null,
      OR: [
        { participants: { some: { userId } } },
        { createdById: userId },
        { participants: { none: {} } },
      ],
    },
    select: { id: true },
  })

  if (threads.length === 0) return 0

  const threadIds = threads.map((t) => t.id)
  const reads = await prisma.threadRead.findMany({
    where: {
      threadId: { in: threadIds },
      userId,
    },
    select: { threadId: true, lastReadAt: true },
  })

  const readMap = new Map(reads.map((r) => [r.threadId, r.lastReadAt]))

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
