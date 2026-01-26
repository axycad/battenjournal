'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button, Textarea, Input } from '@/components/ui'
import {
  createThread,
  sendMessage,
  sendQuestionCard,
  answerQuestionCard,
  deleteMessage,
  type ThreadWithMessages,
  type MessageWithAuthor,
  type QuestionCardContent,
} from '@/actions/messaging'
import { formatDate } from '@/lib/utils'

// ============================================================================
// THREAD LIST
// ============================================================================

interface ThreadListProps {
  threads: ThreadWithMessages[]
  caseId: string
  basePath: string // e.g., /case/[caseId]/messages
}

export function ThreadList({ threads, caseId, basePath }: ThreadListProps) {
  if (threads.length === 0) {
    return (
      <p className="text-meta text-text-secondary italic py-md">
        No messages yet
      </p>
    )
  }

  return (
    <div className="space-y-sm">
      {threads.map((thread) => (
        <Link
          key={thread.id}
          href={`${basePath}/${thread.id}`}
          className="block p-md bg-white border border-divider rounded-md hover:border-accent-primary transition-colors"
        >
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-sm">
                <span className="text-body font-medium truncate">
                  {thread.subject || (thread.anchorType === 'EVENT' ? 'Event discussion' : 'General')}
                </span>
                {thread.unreadCount > 0 && (
                  <span className="px-xs py-0.5 text-caption bg-accent-primary text-white rounded-full">
                    {thread.unreadCount}
                  </span>
                )}
              </div>

              {thread.lastMessagePreview && (
                <p className="text-meta text-text-secondary mt-xs truncate">
                  {thread.lastMessagePreview}
                </p>
              )}

              <div className="flex items-center gap-sm mt-xs text-caption text-text-secondary">
                <span>{thread.messageCount} message{thread.messageCount !== 1 ? 's' : ''}</span>
                {thread.lastMessageAt && (
                  <>
                    <span>·</span>
                    <span>{formatDate(thread.lastMessageAt)}</span>
                  </>
                )}
              </div>
            </div>

            {thread.anchorType === 'EVENT' && (
              <span className="px-sm py-1 text-caption bg-bg-primary rounded text-text-secondary ml-sm">
                Event
              </span>
            )}
          </div>
        </Link>
      ))}
    </div>
  )
}

// ============================================================================
// NEW THREAD FORM
// ============================================================================

interface NewThreadFormProps {
  caseId: string
  anchorType: 'case' | 'event'
  anchorId: string
  eventTitle?: string
  onCreated?: (threadId: string) => void
  onCancel?: () => void
}

export function NewThreadForm({
  caseId,
  anchorType,
  anchorId,
  eventTitle,
  onCreated,
  onCancel,
}: NewThreadFormProps) {
  const router = useRouter()
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit() {
    if (!message.trim()) {
      setError('Message is required')
      return
    }

    setSaving(true)
    setError('')

    const result = await createThread({
      caseId,
      anchorType,
      anchorId,
      subject: subject.trim() || undefined,
      initialMessage: message.trim(),
    })

    if (!result.success) {
      setError(result.error || 'Failed to create thread')
      setSaving(false)
    } else {
      router.refresh()
      onCreated?.(result.data!.threadId)
    }
  }

  return (
    <div className="p-md bg-white border border-divider rounded-md space-y-sm">
      <h3 className="text-body font-medium">
        {anchorType === 'event' ? `Discuss: ${eventTitle || 'Event'}` : 'New discussion'}
      </h3>

      {anchorType === 'case' && (
        <Input
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Subject (optional)"
        />
      )}

      <Textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Write your message..."
        rows={3}
        autoFocus
      />

      {error && <p className="text-caption text-semantic-critical">{error}</p>}

      <div className="flex gap-sm">
        {onCancel && (
          <Button variant="secondary" onClick={onCancel} disabled={saving}>
            Cancel
          </Button>
        )}
        <Button onClick={handleSubmit} loading={saving}>
          Start discussion
        </Button>
      </div>
    </div>
  )
}

// ============================================================================
// MESSAGE CARD
// ============================================================================

interface MessageCardProps {
  message: MessageWithAuthor
  currentUserId: string
  onDeleted?: () => void
}

export function MessageCard({ message, currentUserId, onDeleted }: MessageCardProps) {
  const router = useRouter()
  const [deleting, setDeleting] = useState(false)
  const [saving, setSaving] = useState(false)

  const isOwn = message.author.id === currentUserId
  const isClinician = message.author.memberType === 'CARE_TEAM'

  async function handleDelete() {
    setSaving(true)
    await deleteMessage(message.id)
    setSaving(false)
    router.refresh()
    onDeleted?.()
  }

  // Question card handling
  if (message.messageType === 'QUESTION_CARD') {
    return (
      <QuestionCardMessage
        message={message}
        currentUserId={currentUserId}
        onDeleted={onDeleted}
      />
    )
  }

  // Answer styling
  if (message.messageType === 'ANSWER') {
    return (
      <div className="p-sm bg-semantic-success/5 border-l-2 border-semantic-success rounded-r-sm">
        <div className="flex items-center gap-sm mb-xs">
          <span className="text-caption text-semantic-success font-medium">Answer</span>
          <span className="text-caption text-text-secondary">
            {message.author.name || 'Unknown'}
            {isClinician && message.author.specialty && ` · ${message.author.specialty}`}
          </span>
          <span className="text-caption text-text-secondary">
            {formatDate(message.createdAt)}
          </span>
        </div>
        <p className="text-body text-text-primary whitespace-pre-wrap">{message.content}</p>
      </div>
    )
  }

  // Delete confirmation
  if (deleting) {
    return (
      <div className="p-sm bg-bg-primary rounded-sm">
        <p className="text-meta mb-sm">Delete this message?</p>
        <div className="flex gap-sm">
          <Button
            variant="secondary"
            onClick={() => setDeleting(false)}
            disabled={saving}
            className="h-auto py-1"
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            loading={saving}
            className="h-auto py-1"
          >
            Delete
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className={`p-sm rounded-sm ${isOwn ? 'bg-accent-primary/5' : 'bg-bg-primary'}`}>
      <div className="flex items-center justify-between mb-xs">
        <div className="flex items-center gap-sm">
          <span className="text-meta font-medium">
            {message.author.name || 'Unknown'}
          </span>
          {isClinician && (
            <span className="px-xs py-0.5 text-caption bg-accent-primary/10 text-accent-primary rounded">
              {message.author.specialty || 'Clinician'}
            </span>
          )}
          <span className="text-caption text-text-secondary">
            {formatDate(message.createdAt)}
          </span>
        </div>

        {isOwn && (
          <button
            onClick={() => setDeleting(true)}
            className="text-caption text-text-secondary hover:text-semantic-critical"
          >
            Delete
          </button>
        )}
      </div>

      <p className="text-body text-text-primary whitespace-pre-wrap">{message.content}</p>

      {message.document && (
        <div className="mt-sm pt-sm border-t border-divider">
          <a
            href={`/api/files/${message.document.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-xs text-meta text-accent-primary hover:underline"
          >
            📎 {message.document.title}
          </a>
        </div>
      )}
    </div>
  )
}

// ============================================================================
// QUESTION CARD MESSAGE
// ============================================================================

interface QuestionCardMessageProps {
  message: MessageWithAuthor
  currentUserId: string
  onDeleted?: () => void
}

function QuestionCardMessage({ message, currentUserId, onDeleted }: QuestionCardMessageProps) {
  const router = useRouter()
  const [answering, setAnswering] = useState(false)
  const [answer, setAnswer] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  let content: QuestionCardContent
  try {
    content = JSON.parse(message.content)
  } catch {
    return <MessageCard message={message} currentUserId={currentUserId} onDeleted={onDeleted} />
  }

  const isClinician = message.author.memberType === 'CARE_TEAM'

  async function handleAnswer() {
    if (!answer.trim()) {
      setError('Answer is required')
      return
    }

    setSaving(true)
    setError('')

    const result = await answerQuestionCard({
      questionMessageId: message.id,
      answer: answer.trim(),
    })

    if (!result.success) {
      setError(result.error || 'Failed to answer')
    } else {
      setAnswering(false)
      setAnswer('')
      router.refresh()
    }

    setSaving(false)
  }

  return (
    <div className="p-sm bg-semantic-warning/5 border border-semantic-warning/30 rounded-sm">
      <div className="flex items-center gap-sm mb-sm">
        <span className="px-xs py-0.5 text-caption bg-semantic-warning/20 text-semantic-warning rounded font-medium">
          Question
        </span>
        <span className="text-meta">
          {message.author.name || 'Unknown'}
          {isClinician && message.author.specialty && ` · ${message.author.specialty}`}
        </span>
        <span className="text-caption text-text-secondary">
          {formatDate(message.createdAt)}
        </span>
        {content.answered && (
          <span className="px-xs py-0.5 text-caption bg-semantic-success/10 text-semantic-success rounded">
            Answered
          </span>
        )}
      </div>

      <p className="text-body text-text-primary font-medium mb-sm">{content.question}</p>

      {content.options && content.options.length > 0 && (
        <div className="space-y-xs mb-sm">
          {content.options.map((option, i) => (
            <div key={i} className="px-sm py-1 bg-white rounded text-meta">
              {option}
            </div>
          ))}
        </div>
      )}

      {!content.answered && !answering && (
        <Button
          variant="secondary"
          onClick={() => setAnswering(true)}
          className="h-auto py-1"
        >
          Answer this question
        </Button>
      )}

      {answering && (
        <div className="space-y-sm mt-sm pt-sm border-t border-semantic-warning/30">
          <Textarea
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder="Your answer..."
            rows={2}
            autoFocus
          />
          {error && <p className="text-caption text-semantic-critical">{error}</p>}
          <div className="flex gap-sm">
            <Button
              variant="secondary"
              onClick={() => setAnswering(false)}
              disabled={saving}
              className="h-auto py-1"
            >
              Cancel
            </Button>
            <Button onClick={handleAnswer} loading={saving} className="h-auto py-1">
              Submit answer
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================================================
// THREAD VIEW
// ============================================================================

interface ThreadViewProps {
  threadId: string
  caseId: string
  messages: MessageWithAuthor[]
  currentUserId: string
  subject?: string | null
  anchorType: 'CASE' | 'EVENT'
}

export function ThreadView({
  threadId,
  caseId,
  messages,
  currentUserId,
  subject,
  anchorType,
}: ThreadViewProps) {
  const router = useRouter()
  const [reply, setReply] = useState('')
  const [isQuestion, setIsQuestion] = useState(false)
  const [questionOptions, setQuestionOptions] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSend() {
    if (!reply.trim()) {
      setError('Message is required')
      return
    }

    setSaving(true)
    setError('')

    let result

    if (isQuestion) {
      const options = questionOptions
        .split('\n')
        .map((o) => o.trim())
        .filter(Boolean)

      result = await sendQuestionCard({
        threadId,
        question: reply.trim(),
        options: options.length > 0 ? options : undefined,
      })
    } else {
      result = await sendMessage({
        threadId,
        content: reply.trim(),
      })
    }

    if (!result.success) {
      setError(result.error || 'Failed to send')
    } else {
      setReply('')
      setIsQuestion(false)
      setQuestionOptions('')
      router.refresh()
    }

    setSaving(false)
  }

  return (
    <div className="space-y-md">
      {/* Thread header */}
      <div className="pb-sm border-b border-divider">
        <h2 className="text-title-md font-medium">
          {subject || (anchorType === 'EVENT' ? 'Event discussion' : 'General discussion')}
        </h2>
        <p className="text-meta text-text-secondary">
          {messages.length} message{messages.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Messages */}
      <div className="space-y-sm">
        {messages.map((message) => (
          <MessageCard
            key={message.id}
            message={message}
            currentUserId={currentUserId}
          />
        ))}
      </div>

      {/* Reply form */}
      <div className="pt-md border-t border-divider space-y-sm">
        <div className="flex items-center gap-sm">
          <label className="flex items-center gap-xs text-meta text-text-secondary cursor-pointer">
            <input
              type="checkbox"
              checked={isQuestion}
              onChange={(e) => setIsQuestion(e.target.checked)}
              className="rounded border-divider"
            />
            Ask a question
          </label>
        </div>

        <Textarea
          value={reply}
          onChange={(e) => setReply(e.target.value)}
          placeholder={isQuestion ? 'Your question...' : 'Write a reply...'}
          rows={3}
        />

        {isQuestion && (
          <div>
            <label className="block text-meta text-text-secondary mb-xs">
              Response options (one per line, optional)
            </label>
            <Textarea
              value={questionOptions}
              onChange={(e) => setQuestionOptions(e.target.value)}
              placeholder="Option 1&#10;Option 2&#10;Option 3"
              rows={3}
            />
          </div>
        )}

        {error && <p className="text-caption text-semantic-critical">{error}</p>}

        <Button onClick={handleSend} loading={saving}>
          {isQuestion ? 'Send question' : 'Send reply'}
        </Button>
      </div>
    </div>
  )
}

// ============================================================================
// INLINE EVENT THREAD BUTTON
// ============================================================================

interface StartEventThreadButtonProps {
  caseId: string
  eventId: string
  eventTitle: string
  existingThreadId?: string
}

export function StartEventThreadButton({
  caseId,
  eventId,
  eventTitle,
  existingThreadId,
}: StartEventThreadButtonProps) {
  const [showForm, setShowForm] = useState(false)
  const router = useRouter()

  if (existingThreadId) {
    return (
      <Link
        href={`/case/${caseId}/messages/${existingThreadId}`}
        className="text-meta text-accent-primary hover:underline"
      >
        View discussion
      </Link>
    )
  }

  if (showForm) {
    return (
      <div className="mt-sm">
        <NewThreadForm
          caseId={caseId}
          anchorType="event"
          anchorId={eventId}
          eventTitle={eventTitle}
          onCreated={(threadId) => {
            router.push(`/case/${caseId}/messages/${threadId}`)
          }}
          onCancel={() => setShowForm(false)}
        />
      </div>
    )
  }

  return (
    <button
      onClick={() => setShowForm(true)}
      className="text-meta text-accent-primary hover:underline"
    >
      Start discussion
    </button>
  )
}
