import { apiClient } from '@/lib/api-client'

// Thread interfaces
export interface Thread {
  id: string
  caseId: string
  anchorType: string
  anchorId: string | null
  subject: string
  createdAt: Date
  createdById: string
  createdBy: {
    id: string
    name: string | null
  }
  participants: Array<{
    id: string
    userId: string
    user: {
      id: string
      name: string | null
      email: string
      role: string
      memberType: string
    }
  }>
  lastMessage: {
    content: string
    createdAt: Date
  } | null
  lastReadAt: Date | null
  messageCount: number
  isUnread: boolean
}

// Get threads for a case
export async function getThreadsAPI(caseId: string): Promise<Thread[]> {
  const params = new URLSearchParams({ caseId })
  return apiClient.get(`/api/messages/threads?${params.toString()}`)
}

// Message interfaces
export interface Message {
  id: string
  threadId: string
  content: string
  createdAt: Date
  authorId: string
  author: {
    id: string
    name: string | null
    email: string
  }
  attachments?: Array<{
    id: string
    fileName: string
    mimeType: string
    fileSize: number
  }>
}

export interface ThreadWithMessages {
  id: string
  caseId: string
  anchorType: string
  anchorId: string | null
  subject: string
  createdAt: Date
  createdById: string
  createdBy: {
    id: string
    name: string | null
  }
  participants: Array<{
    id: string
    userId: string
    user: {
      id: string
      name: string | null
      email: string
      role: string
      memberType: string
    }
  }>
  messages: Message[]
}

// Get thread with messages
export async function getThreadAPI(threadId: string): Promise<ThreadWithMessages> {
  return apiClient.get(`/api/messages/threads/${threadId}`)
}

// Create message input
export interface CreateMessageInput {
  threadId: string
  content: string
  attachments?: File[]
}

// Send a message
export async function sendMessageAPI(input: CreateMessageInput): Promise<Message> {
  if (input.attachments && input.attachments.length > 0) {
    const formData = new FormData()
    formData.append('threadId', input.threadId)
    formData.append('content', input.content)
    input.attachments.forEach((file) => {
      formData.append('attachments', file)
    })

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL || ''}/api/messages`,
      {
        method: 'POST',
        body: formData,
      }
    )

    if (!response.ok) {
      throw new Error(`Send message failed: ${response.status}`)
    }

    return response.json()
  }

  return apiClient.post('/api/messages', {
    threadId: input.threadId,
    content: input.content,
  })
}

// Create thread input
export interface CreateThreadInput {
  caseId: string
  subject: string
  initialMessage: string
  anchorType?: string
  anchorId?: string
}

// Create a new thread
export async function createThreadAPI(input: CreateThreadInput): Promise<ThreadWithMessages> {
  return apiClient.post('/api/messages/threads', input)
}
