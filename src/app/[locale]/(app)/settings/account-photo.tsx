'use client'

import { useRef, useState } from 'react'
import { Button } from '@/components/ui'

interface AccountPhotoProps {
  initialUrl?: string | null
  displayName: string
}

export function AccountPhoto({ initialUrl, displayName }: AccountPhotoProps) {
  const [photoUrl, setPhotoUrl] = useState(initialUrl || '')
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    const validTypes = ['image/jpeg', 'image/png', 'image/heic', 'image/heif']
    if (!validTypes.includes(file.type)) {
      setError('Only images (JPG, PNG, HEIC) are allowed')
      return
    }

    if (file.size > 25 * 1024 * 1024) {
      setError('This file is larger than 25MB')
      return
    }

    setUploading(true)
    setError('')

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/user-photo', {
        method: 'POST',
        body: formData,
      })

      const result = await response.json()
      if (!response.ok) {
        setError(result.error || 'Upload failed')
      } else {
        setPhotoUrl(result.url)
      }
    } catch {
      setError('Upload failed')
    } finally {
      setUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  return (
    <div className="flex items-center gap-md">
      <div className="w-16 h-16 rounded-full overflow-hidden bg-bg-primary border border-divider flex items-center justify-center text-title-md">
        {photoUrl ? (
          <img
            src={photoUrl}
            alt={`${displayName} avatar`}
            className="w-full h-full object-cover"
          />
        ) : (
          <span>{displayName.slice(0, 1).toUpperCase()}</span>
        )}
      </div>
      <div className="space-y-xs">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/heic,image/heif"
          onChange={handlePhotoUpload}
          disabled={uploading}
          className="hidden"
        />
        <Button
          variant="secondary"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="h-auto"
        >
          {uploading ? 'Uploading...' : 'Upload photo'}
        </Button>
        {error && <p className="text-caption text-semantic-critical">{error}</p>}
      </div>
    </div>
  )
}
