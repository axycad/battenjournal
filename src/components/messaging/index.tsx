'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import {Link} from '@/navigation'
import { Button, Textarea, Input } from '@/components/ui'
import { useRouter } from '@/navigation'
import {
  createThread,
  sendMessage,
  sendQuestionCard,
  answerQuestionCard,
  deleteMessage,
  getCaseParticipants,
  getCaseDocuments,
  type ThreadWithMessages,
  type MessageWithAuthor,
  type QuestionCardContent,
  type CaseParticipant,
} from '@/lib/api/messaging'
import { formatDate } from '@/lib/utils'

// ============================================================================
// THREAD LIST
// ============================================================================

interface ThreadListProps {
  threads: ThreadWithMessages[]
  caseId: string
  basePath: string
}

export function ThreadList({ threads, caseId, basePath }: ThreadListProps) {
  const t = useTranslations('messaging')
  if (threads.length === 0) {
    return (
      <p className="text-meta text-text-secondary italic py-md">
        {t('noMessagesYet')}
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
                  {thread.subject ||
                    (thread.anchorType === 'EVENT'
                      ? t('eventDiscussion')
                      : t('generalDiscussion'))}
                </span>
                {thread.unreadCount > 0 && (
                  <span className="px-xs py-0.5 text-caption bg-accent-primary text-white rounded-full">
                    {thread.unreadCount}
                  </span>
                )}
              </div>

              {thread.participants.length > 0 && (
                <div className="flex items-center gap-xs mt-xs flex-wrap">
                  {thread.participants.slice(0, 3).map((p) => (
                    <span
                      key={p.id}
                      className={`px-xs py-0.5 text-caption rounded ${
                        p.memberType === 'CARE_TEAM'
                          ? 'bg-accent-primary/10 text-accent-primary'
                          : p.memberType === 'RESEARCH_TEAM'
                          ? 'bg-purple-100 text-purple-700'
                          : 'bg-bg-primary text-text-secondary'
                      }`}
                    >
                      {p.name || p.email.split('@')[0]}
                    </span>
                  ))}
                  {thread.participants.length > 3 && (
                    <span className="text-caption text-text-secondary">
                      {t('participantsMore', { count: thread.participants.length - 3 })}
                    </span>
                  )}
                </div>
              )}

              {thread.lastMessagePreview && (
                <p className="text-meta text-text-secondary mt-xs truncate">
                  {thread.lastMessagePreview}
                </p>
              )}

              <div className="flex items-center gap-sm mt-xs text-caption text-text-secondary">
                <span>
                  {t('messageCount', { count: thread.messageCount })}
                </span>
                {thread.lastMessageAt && (
                  <>
                    <span>-</span>
                    <span>{formatDate(thread.lastMessageAt)}</span>
                  </>
                )}
              </div>
            </div>

            {thread.anchorType === 'EVENT' && (
              <span className="px-sm py-1 text-caption bg-bg-primary rounded text-text-secondary ml-sm">
                {t('eventTag')}
              </span>
            )}
          </div>
        </Link>
      ))}
    </div>
  )
}

// ============================================================================
// PARTICIPANT PICKER
// ============================================================================

interface ParticipantPickerProps {
  caseId: string
  selectedIds: string[]
  onSelectionChange: (ids: string[]) => void
  currentUserId: string
}

export function ParticipantPicker({
  caseId,
  selectedIds,
  onSelectionChange,
  currentUserId,
}: ParticipantPickerProps) {
  const t = useTranslations('messaging')
  const [participants, setParticipants] = useState<CaseParticipant[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getCaseParticipants(caseId).then((data) => {
      setParticipants(data.filter((p) => p.id !== currentUserId))
      setLoading(false)
    })
  }, [caseId, currentUserId])

  function toggleParticipant(userId: string) {
    if (selectedIds.includes(userId)) {
      onSelectionChange(selectedIds.filter((id) => id !== userId))
    } else {
      onSelectionChange([...selectedIds, userId])
    }
  }

  if (loading) {
    return <p className="text-meta text-text-secondary">{t('loadingTeam')}</p>
  }

  const careTeam = participants.filter((p) => p.memberType === 'CARE_TEAM')
  const researchTeam = participants.filter((p) => p.memberType === 'RESEARCH_TEAM')
  const family = participants.filter((p) => p.memberType === 'PARENT')

  return (
    <div className="space-y-sm">
      <label className="block text-meta font-medium text-text-primary">
        {t('shareWith')}
      </label>

      {careTeam.length > 0 && (
        <div>
          <p className="text-caption text-text-secondary mb-xs">{t('careTeam')}</p>
          <div className="flex flex-wrap gap-xs">
            {careTeam.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => toggleParticipant(p.id)}
                className={`px-sm py-1 text-meta rounded-full border transition-colors ${
                  selectedIds.includes(p.id)
                    ? 'bg-accent-primary text-white border-accent-primary'
                    : 'bg-white text-text-primary border-divider hover:border-accent-primary'
                }`}
              >
                {p.name || p.email.split('@')[0]}
                {p.specialty && ` (${p.specialty})`}
              </button>
            ))}
          </div>
        </div>
      )}

      {researchTeam.length > 0 && (
        <div>
          <p className="text-caption text-text-secondary mb-xs">{t('researchTeam')}</p>
          <div className="flex flex-wrap gap-xs">
            {researchTeam.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => toggleParticipant(p.id)}
                className={`px-sm py-1 text-meta rounded-full border transition-colors ${
                  selectedIds.includes(p.id)
                    ? 'bg-purple-600 text-white border-purple-600'
                    : 'bg-white text-text-primary border-divider hover:border-purple-600'
                }`}
              >
                {p.name || p.email.split('@')[0]}
              </button>
            ))}
          </div>
        </div>
      )}

      {family.length > 0 && (
        <div>
          <p className="text-caption text-text-secondary mb-xs">{t('family')}</p>
          <div className="flex flex-wrap gap-xs">
            {family.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => toggleParticipant(p.id)}
                className={`px-sm py-1 text-meta rounded-full border transition-colors ${
                  selectedIds.includes(p.id)
                    ? 'bg-text-primary text-white border-text-primary'
                    : 'bg-white text-text-primary border-divider hover:border-text-primary'
                }`}
              >
                {p.name || p.email.split('@')[0]}
              </button>
            ))}
          </div>
        </div>
      )}

      {participants.length === 0 && (
        <p className="text-meta text-text-secondary italic">
          {t('noOtherMembers')}
        </p>
      )}
    </div>
  )
}

// ============================================================================
// DOCUMENT PICKER
// ============================================================================

interface DocumentPickerProps {
  caseId: string
  selectedId: string | null
  onSelect: (id: string | null) => void
}

export function DocumentPicker({ caseId, selectedId, onSelect }: DocumentPickerProps) {
  const t = useTranslations('messaging')
  const [documents, setDocuments] = useState<{
    id: string
    title: string
    mimeType: string
  }[]>([])
  const [loading, setLoading] = useState(true)
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    getCaseDocuments(caseId).then((data) => {
      setDocuments(data)
      setLoading(false)
    })
  }, [caseId])

  const selectedDoc = documents.find((d) => d.id === selectedId)

  function getMimeLabel(mimeType: string) {
    if (mimeType.startsWith('image/')) return '[IMG]'
    if (mimeType === 'application/pdf') return '[PDF]'
    return '[FILE]'
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-xs text-meta text-accent-primary hover:underline"
      >
        {t('attachmentLabel', { title: selectedDoc ? selectedDoc.title : t('none') })}
      </button>

      {isOpen && (
        <div className="absolute bottom-full left-0 mb-xs w-72 max-h-60 overflow-y-auto bg-white border border-divider rounded-md shadow-lg z-10">
          {loading ? (
            <p className="p-sm text-meta text-text-secondary">{t('loading')}</p>
          ) : documents.length === 0 ? (
            <p className="p-sm text-meta text-text-secondary">{t('noDocuments')}</p>
          ) : (
            <>
              {selectedId && (
                <button
                  type="button"
                  onClick={() => {
                    onSelect(null)
                    setIsOpen(false)
                  }}
                  className="w-full px-sm py-xs text-left text-meta text-semantic-critical hover:bg-bg-primary"
                >
                  {t('removeAttachment')}
                </button>
              )}
              {documents.map((doc) => (
                <button
                  key={doc.id}
                  type="button"
                  onClick={() => {
                    onSelect(doc.id)
                    setIsOpen(false)
                  }}
                  className={`w-full px-sm py-xs text-left hover:bg-bg-primary flex items-center gap-xs ${
                    doc.id === selectedId ? 'bg-accent-primary/5' : ''
                  }`}
                >
                  <span>{getMimeLabel(doc.mimeType)}</span>
                  <span className="text-meta truncate flex-1">{doc.title}</span>
                </button>
              ))}
            </>
          )}
        </div>
      )}
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
  currentUserId: string
  onCreated?: (threadId: string) => void
  onCancel?: () => void
}

export function NewThreadForm({
  caseId,
  anchorType,
  anchorId,
  eventTitle,
  currentUserId,
  onCreated,
  onCancel,
}: NewThreadFormProps) {
  const t = useTranslations('messaging')
  const router = useRouter()
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [participantIds, setParticipantIds] = useState<string[]>([])
  const [documentId, setDocumentId] = useState<string | null>(null)
  const [uploadingFile, setUploadingFile] = useState(false)
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingFile(true)
    setError('')

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('caseId', caseId)
      formData.append('title', file.name)

      const response = await fetch('/api/documents/upload', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        throw new Error('Upload failed')
      }

      const data = await response.json()
      setDocumentId(data.documentId)
      setUploadedFileName(file.name)
    } catch (err) {
      setError('Failed to upload file')
    } finally {
      setUploadingFile(false)
    }
  }

  async function handleSubmit() {
    if (!message.trim()) {
      setError(t('errorMessageRequired'))
      return
    }

    if (participantIds.length === 0) {
      setError(t('errorSelectParticipant'))
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
      participantIds,
      documentId: documentId || undefined,
    })

    if (!result.success) {
      setError(result.error || t('errorCreateThread'))
      setSaving(false)
    } else {
      router.refresh()
      onCreated?.(result.data!.threadId)
    }
  }

  return (
    <div className="p-md bg-white border border-divider rounded-md space-y-md">
      <h3 className="text-body font-medium">
        {anchorType === 'event'
          ? t('discussEvent', { title: eventTitle || t('eventFallback') })
          : t('newDiscussion')}
      </h3>

      <ParticipantPicker
        caseId={caseId}
        selectedIds={participantIds}
        onSelectionChange={setParticipantIds}
        currentUserId={currentUserId}
      />

      {anchorType === 'case' && (
        <Input
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder={t('subjectOptional')}
        />
      )}

      <Textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder={t('messagePlaceholder')}
        rows={3}
      />

      {/* File upload section */}
      <div className="space-y-xs">
        <div className="flex items-center gap-sm">
          <label className="cursor-pointer">
            <input
              type="file"
              onChange={handleFileUpload}
              disabled={uploadingFile || saving}
              className="hidden"
              accept="image/*,.pdf,.doc,.docx"
              id="file-upload-new-thread"
            />
            <span className="text-meta text-purple-600 hover:text-purple-700 hover:underline">
              {uploadingFile ? t('uploading', { defaultMessage: 'Uploading...' }) : '📎 Upload new file'}
            </span>
          </label>
          {!uploadedFileName && (
            <>
              <span className="text-meta text-text-secondary">or</span>
              <DocumentPicker
                caseId={caseId}
                selectedId={documentId}
                onSelect={(id) => {
                  setDocumentId(id)
                  setUploadedFileName(null)
                }}
              />
            </>
          )}
        </div>
        {uploadedFileName && (
          <div className="flex items-center gap-sm p-sm bg-purple-50 border border-purple-200 rounded-md">
            <span className="text-meta text-purple-900">📎 {uploadedFileName}</span>
            <button
              type="button"
              onClick={() => {
                setDocumentId(null)
                setUploadedFileName(null)
              }}
              className="text-caption text-red-600 hover:underline ml-auto"
            >
              Remove
            </button>
          </div>
        )}
      </div>

      {error && <p className="text-caption text-semantic-critical">{error}</p>}

      <div className="flex gap-sm">
        {onCancel && (
          <Button variant="secondary" onClick={onCancel} disabled={saving}>
            {t('cancel')}
          </Button>
        )}
        <Button onClick={handleSubmit} loading={saving}>
          {t('startDiscussion')}
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

export function MessageCard({
  message,
  currentUserId,
  onDeleted,
}: MessageCardProps) {
  const t = useTranslations('messaging')
  const router = useRouter()
  const [deleting, setDeleting] = useState(false)
  const [saving, setSaving] = useState(false)

  const isOwn = message.author.id === currentUserId
  const isClinician = message.author.memberType === 'CARE_TEAM'
  const isResearcher = message.author.memberType === 'RESEARCH_TEAM'

  async function handleDelete() {
    setSaving(true)
    await deleteMessage(message.id)
    setSaving(false)
    router.refresh()
    onDeleted?.()
  }

  if (message.messageType === 'QUESTION_CARD') {
    return (
      <QuestionCardMessage
        message={message}
        currentUserId={currentUserId}
        onDeleted={onDeleted}
      />
    )
  }

  if (message.messageType === 'ANSWER') {
    return (
      <div className="p-sm bg-semantic-success/5 border-l-2 border-semantic-success rounded-r-sm">
        <div className="flex items-center gap-sm mb-xs">
          <span className="text-caption text-semantic-success font-medium">{t('answer')}</span>
          <span className="text-caption text-text-secondary">
            {message.author.name || t('unknown')}
            {isClinician && message.author.specialty && ` - ${message.author.specialty}`}
          </span>
          <span className="text-caption text-text-secondary">
            {formatDate(message.createdAt)}
          </span>
        </div>
        <p className="text-body text-text-primary whitespace-pre-wrap">
          {message.content}
        </p>
      </div>
    )
  }

  if (deleting) {
    return (
      <div className="p-sm bg-bg-primary rounded-sm">
        <p className="text-meta mb-sm">{t('deleteConfirm')}</p>
        <div className="flex gap-sm">
          <Button
            variant="secondary"
            onClick={() => setDeleting(false)}
            disabled={saving}
            className="h-auto py-1"
          >
            {t('cancel')}
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            loading={saving}
            className="h-auto py-1"
          >
            {t('delete')}
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
            {message.author.name || t('unknown')}
          </span>
          {isClinician && (
            <span className="px-xs py-0.5 text-caption bg-accent-primary/10 text-accent-primary rounded">
              {message.author.specialty || t('clinician')}
            </span>
          )}
          {isResearcher && (
            <span className="px-xs py-0.5 text-caption bg-purple-100 text-purple-700 rounded">
              {t('researcher')}
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
            {t('delete')}
          </button>
        )}
      </div>

      <p className="text-body text-text-primary whitespace-pre-wrap">{message.content}</p>

      {message.document && (
        <div className="mt-sm p-sm bg-white border border-divider rounded flex items-center gap-sm">
          <div className="flex-1 min-w-0">
            <p className="text-meta font-medium truncate">{message.document.title}</p>
            <p className="text-caption text-text-secondary">
              {message.document.originalFilename}
            </p>
          </div>
          <a
            href={`/api/files/${message.document.storagePath}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-meta text-accent-primary hover:underline"
          >
            {t('view')}
          </a>
        </div>
      )}
    </div>
  )
}

// ============================================================================
// QUESTION CARD MESSAGE
// ============================================================================

function QuestionCardMessage({ message, currentUserId, onDeleted }: MessageCardProps) {
  const t = useTranslations('messaging')
  const router = useRouter()
  const [answering, setAnswering] = useState(false)
  const [answer, setAnswer] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const isClinician = message.author.memberType === 'CARE_TEAM'

  let content: QuestionCardContent
  try {
    content = JSON.parse(message.content)
  } catch {
    content = { question: message.content }
  }

  async function handleAnswer() {
    if (!answer.trim()) {
      setError(t('errorAnswerRequired'))
      return
    }

    setSaving(true)
    setError('')

    const result = await answerQuestionCard({
      questionMessageId: message.id,
      answer: answer.trim(),
    })

    if (!result.success) {
      setError(result.error || t('errorAnswerFailed'))
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
          {t('question')}
        </span>
        <span className="text-meta">
          {message.author.name || t('unknown')}
          {isClinician && message.author.specialty && ` - ${message.author.specialty}`}
        </span>
        <span className="text-caption text-text-secondary">
          {formatDate(message.createdAt)}
        </span>
        {content.answered && (
          <span className="px-xs py-0.5 text-caption bg-semantic-success/10 text-semantic-success rounded">
            {t('answered')}
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
          {t('answerThisQuestion')}
        </Button>
      )}

      {answering && (
        <div className="space-y-sm mt-sm pt-sm border-t border-semantic-warning/30">
          <Textarea
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder={t('yourAnswer')}
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
              {t('cancel')}
            </Button>
            <Button onClick={handleAnswer} loading={saving} className="h-auto py-1">
              {t('submitAnswer')}
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
  participants: {
    id: string
    name: string | null
    email: string
    memberType: string | null
  }[]
}

export function ThreadView({
  threadId,
  caseId,
  messages,
  currentUserId,
  subject,
  anchorType,
  participants,
}: ThreadViewProps) {
  const t = useTranslations('messaging')
  const router = useRouter()
  const [reply, setReply] = useState('')
  const [isQuestion, setIsQuestion] = useState(false)
  const [questionOptions, setQuestionOptions] = useState('')
  const [documentId, setDocumentId] = useState<string | null>(null)
  const [uploadingFile, setUploadingFile] = useState(false)
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingFile(true)
    setError('')

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('caseId', caseId)
      formData.append('title', file.name)

      const response = await fetch('/api/documents/upload', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        throw new Error('Upload failed')
      }

      const data = await response.json()
      setDocumentId(data.documentId)
      setUploadedFileName(file.name)
    } catch (err) {
      setError('Failed to upload file')
    } finally {
      setUploadingFile(false)
    }
  }

  async function handleSend() {
    if (!reply.trim()) {
      setError(t('errorMessageRequired'))
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
        documentId: documentId || undefined,
      })
    }

    if (!result.success) {
      setError(result.error || t('errorSendFailed'))
    } else {
      setReply('')
      setIsQuestion(false)
      setQuestionOptions('')
      setDocumentId(null)
      setUploadedFileName(null)
      router.refresh()
    }

    setSaving(false)
  }

  return (
    <div className="space-y-md">
      <div className="pb-sm border-b border-divider">
        <h2 className="text-title-md font-medium">
          {subject ||
            (anchorType === 'EVENT' ? t('eventDiscussion') : t('generalDiscussion'))}
        </h2>
        <div className="flex items-center gap-sm mt-xs flex-wrap">
          <span className="text-meta text-text-secondary">
            {t('messageCount', { count: messages.length })}
          </span>
          <span className="text-text-secondary">-</span>
          <span className="text-meta text-text-secondary">{t('participantsLabel')}</span>
          {participants.map((p) => (
            <span
              key={p.id}
              className={`px-xs py-0.5 text-caption rounded ${
                p.memberType === 'CARE_TEAM'
                  ? 'bg-accent-primary/10 text-accent-primary'
                  : p.memberType === 'RESEARCH_TEAM'
                  ? 'bg-purple-100 text-purple-700'
                  : 'bg-bg-primary text-text-secondary'
              }`}
            >
              {p.name || p.email.split('@')[0]}
            </span>
          ))}
        </div>
      </div>

      <div className="space-y-sm">
        {messages.map((message) => (
          <MessageCard
            key={message.id}
            message={message}
            currentUserId={currentUserId}
          />
        ))}
      </div>

      <div className="pt-md border-t border-divider space-y-sm">
        <div className="flex items-center gap-sm">
          <label className="flex items-center gap-xs text-meta text-text-secondary cursor-pointer">
            <input
              type="checkbox"
              checked={isQuestion}
              onChange={(e) => setIsQuestion(e.target.checked)}
              className="rounded border-divider"
            />
            {t('askQuestion')}
          </label>
        </div>

        <Textarea
          value={reply}
          onChange={(e) => setReply(e.target.value)}
          placeholder={isQuestion ? t('yourQuestion') : t('replyPlaceholder')}
          rows={3}
        />

        {isQuestion && (
          <div>
            <label className="block text-meta text-text-secondary mb-xs">
              {t('responseOptions')}
            </label>
            <Textarea
              value={questionOptions}
              onChange={(e) => setQuestionOptions(e.target.value)}
              placeholder={t('responseOptionsPlaceholder')}
              rows={3}
            />
          </div>
        )}

        {!isQuestion && (
          <div className="space-y-xs">
            <div className="flex items-center gap-sm">
              <label className="cursor-pointer">
                <input
                  type="file"
                  onChange={handleFileUpload}
                  disabled={uploadingFile || saving}
                  className="hidden"
                  accept="image/*,.pdf,.doc,.docx"
                  id="file-upload-reply"
                />
                <span className="text-meta text-purple-600 hover:text-purple-700 hover:underline">
                  {uploadingFile ? t('uploading', { defaultMessage: 'Uploading...' }) : '📎 Upload new file'}
                </span>
              </label>
              {!uploadedFileName && (
                <>
                  <span className="text-meta text-text-secondary">or</span>
                  <DocumentPicker
                    caseId={caseId}
                    selectedId={documentId}
                    onSelect={(id) => {
                      setDocumentId(id)
                      setUploadedFileName(null)
                    }}
                  />
                </>
              )}
            </div>
            {uploadedFileName && (
              <div className="flex items-center gap-sm p-sm bg-purple-50 border border-purple-200 rounded-md">
                <span className="text-meta text-purple-900">📎 {uploadedFileName}</span>
                <button
                  type="button"
                  onClick={() => {
                    setDocumentId(null)
                    setUploadedFileName(null)
                  }}
                  className="text-caption text-red-600 hover:underline ml-auto"
                >
                  Remove
                </button>
              </div>
            )}
          </div>
        )}

        {error && <p className="text-caption text-semantic-critical">{error}</p>}

        <Button onClick={handleSend} loading={saving}>
          {isQuestion ? t('sendQuestion') : t('sendReply')}
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
  currentUserId: string
}

export function StartEventThreadButton({
  caseId,
  eventId,
  eventTitle,
  existingThreadId,
  currentUserId,
}: StartEventThreadButtonProps) {
  const t = useTranslations('messaging')
  const [showForm, setShowForm] = useState(false)
  const router = useRouter()

  if (existingThreadId) {
    return (
      <Link
        href={`/case/${caseId}/messages/${existingThreadId}`}
        className="text-meta text-accent-primary hover:underline"
      >
        {t('viewDiscussion')}
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
          currentUserId={currentUserId}
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
      {t('startDiscussion')}
    </button>
  )
}
