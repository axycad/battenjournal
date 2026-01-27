'use client'

import { useRouter } from 'next/navigation'
import { NewThreadForm } from '@/components/messaging'

interface NewThreadFormWrapperProps {
  caseId: string
  currentUserId: string
}

export function NewThreadFormWrapper({
  caseId,
  currentUserId,
}: NewThreadFormWrapperProps) {
  const router = useRouter()

  return (
    <NewThreadForm
      caseId={caseId}
      anchorType="case"
      anchorId={caseId}
      currentUserId={currentUserId}
      onCreated={(threadId) => {
        router.push(`/case/${caseId}/messages/${threadId}`)
      }}
      onCancel={() => {
        router.push(`/case/${caseId}/messages`)
      }}
    />
  )
}
