import { apiClient } from '@/lib/api-client'

export interface Document {
  id: string
  caseId: string
  title: string
  description?: string
  mimeType: string
  blobUrl: string
  uploadedAt: Date
  uploadedBy: {
    id: string
    name: string | null
  }
  visibleScopes?: Array<{
    code: string
    label: string
  }>
}

export interface UploadDocumentInput {
  caseId: string
  title: string
  description?: string
  file: File
}

// Get documents for a case
export async function getDocumentsAPI(caseId: string): Promise<Document[]> {
  return apiClient.get(`/api/documents?caseId=${caseId}`)
}

// Get a specific document
export async function getDocumentAPI(documentId: string): Promise<Document> {
  return apiClient.get(`/api/documents/${documentId}`)
}

// Upload a new document
export async function uploadDocumentAPI(
  input: UploadDocumentInput
): Promise<Document> {
  const formData = new FormData()
  formData.append('file', input.file)
  formData.append('caseId', input.caseId)
  formData.append('title', input.title)
  if (input.description) {
    formData.append('description', input.description)
  }

  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL || ''}/api/documents/upload`,
    {
      method: 'POST',
      body: formData,
      // Don't set Content-Type header - browser will set it with boundary
    }
  )

  if (!response.ok) {
    throw new Error(`Upload failed: ${response.status}`)
  }

  return response.json()
}

// Delete a document
export async function deleteDocumentAPI(documentId: string): Promise<void> {
  return apiClient.delete(`/api/documents/${documentId}`)
}
