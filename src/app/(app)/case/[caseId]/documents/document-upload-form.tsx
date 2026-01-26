'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Button, Input, Select } from '@/components/ui'
import type { Scope } from '@prisma/client'

interface DocumentUploadFormProps {
  caseId: string
  scopes: Scope[]
}

const DOCUMENT_KINDS = [
  { value: 'LAB_REPORT', label: 'Lab report' },
  { value: 'CLINIC_LETTER', label: 'Clinic letter' },
  { value: 'GENETIC_REPORT', label: 'Genetic report' },
  { value: 'INSURANCE', label: 'Insurance' },
  { value: 'OTHER', label: 'Other' },
]

export function DocumentUploadForm({ caseId, scopes }: DocumentUploadFormProps) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [file, setFile] = useState<File | null>(null)
  const [title, setTitle] = useState('')
  const [kind, setKind] = useState('OTHER')
  const [selectedScopes, setSelectedScopes] = useState<string[]>(['care_admin'])
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      setFile(selectedFile)
      if (!title) {
        // Use filename without extension as default title
        setTitle(selectedFile.name.replace(/\.[^/.]+$/, ''))
      }
      setError('')
    }
  }

  function toggleScope(code: string) {
    setSelectedScopes((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    )
  }

  async function handleUpload() {
    if (!file) {
      setError('Please select a file')
      return
    }

    if (selectedScopes.length === 0) {
      setError('Please select at least one category')
      return
    }

    setUploading(true)
    setError('')

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('caseId', caseId)
      formData.append('title', title || file.name)
      formData.append('kind', kind)
      formData.append('scopeCodes', selectedScopes.join(','))

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      const result = await response.json()

      if (!response.ok) {
        setError(result.error || 'Upload failed')
        return
      }

      // Reset form
      setFile(null)
      setTitle('')
      setKind('OTHER')
      setSelectedScopes(['care_admin'])
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }

      // Refresh page to show new document
      router.refresh()
    } catch {
      setError('Upload failed')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-sm">
      {/* File input */}
      <div>
        <label className="block text-meta text-text-secondary mb-xs">
          File (PDF or image, max 25MB)
        </label>
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png,.heic,.heif"
          onChange={handleFileSelect}
          className="block w-full text-body text-text-primary
            file:mr-sm file:py-2 file:px-sm
            file:rounded-sm file:border-0
            file:text-meta file:font-medium
            file:bg-accent-primary/10 file:text-accent-primary
            hover:file:bg-accent-primary/20"
        />
        {file && (
          <p className="mt-xs text-meta text-text-secondary">
            Selected: {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
          </p>
        )}
      </div>

      {/* Title */}
      <Input
        label="Title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="e.g., Neurology report January 2026"
      />

      {/* Document type */}
      <Select
        label="Document type"
        value={kind}
        onChange={(e) => setKind(e.target.value)}
        options={DOCUMENT_KINDS}
      />

      {/* Scope selection */}
      <div>
        <label className="block text-meta text-text-secondary mb-xs">
          Categories (who can see this)
        </label>
        <div className="flex flex-wrap gap-xs">
          {scopes.map((scope) => (
            <button
              key={scope.id}
              type="button"
              onClick={() => toggleScope(scope.code)}
              className={`px-sm py-1 text-meta rounded-sm border transition-colors ${
                selectedScopes.includes(scope.code)
                  ? 'border-accent-primary bg-accent-primary/10 text-accent-primary'
                  : 'border-divider text-text-secondary hover:border-accent-primary'
              }`}
            >
              {scope.label}
            </button>
          ))}
        </div>
        <p className="mt-xs text-caption text-text-secondary">
          Clinicians will only see this document if they have access to these categories.
        </p>
      </div>

      {error && <p className="text-caption text-semantic-critical">{error}</p>}

      <Button onClick={handleUpload} loading={uploading} disabled={!file}>
        Upload document
      </Button>
    </div>
  )
}
