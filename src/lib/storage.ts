cat > src/lib/storage.ts << 'EOF'
import { createHash } from 'crypto'
import { put, del } from '@vercel/blob'
import path from 'path'

// Storage service interface
export interface StorageService {
  upload(file: Buffer, filename: string, mimeType: string): Promise<StorageResult>
  delete(storagePath: string): Promise<void>
  getUrl(storagePath: string): string
  read(storagePath: string): Promise<Buffer>
}

export interface StorageResult {
  path: string
  url: string
  size: number
  checksum: string
  mimeType: string
}

// Configuration
const MAX_FILE_SIZE = 25 * 1024 * 1024 // 25MB

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/heic',
  'image/heif',
  'application/pdf',
]

const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.heic', '.heif', '.pdf']

export class ValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ValidationError'
  }
}

export function validateFile(
  file: Buffer,
  filename: string,
  mimeType: string
): void {
  if (file.length > MAX_FILE_SIZE) {
    throw new ValidationError('This file is larger than 25MB.')
  }

  if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
    throw new ValidationError(
      'Only images (JPG, PNG, HEIC) and PDFs are allowed.'
    )
  }

  const ext = path.extname(filename).toLowerCase()
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    throw new ValidationError(
      'Only images (JPG, PNG, HEIC) and PDFs are allowed.'
    )
  }
}

function generateChecksum(buffer: Buffer): string {
  return createHash('sha256').update(buffer).digest('hex')
}

function generateStoragePath(filename: string, checksum: string): string {
  const ext = path.extname(filename).toLowerCase()
  const date = new Date()
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  return `${year}/${month}/${checksum.slice(0, 16)}${ext}`
}

// Vercel Blob implementation
class VercelBlobStorageService implements StorageService {
  private urlMap: Map<string, string> = new Map()

  async upload(
    file: Buffer,
    filename: string,
    mimeType: string
  ): Promise<StorageResult> {
    validateFile(file, filename, mimeType)

    const checksum = generateChecksum(file)
    const storagePath = generateStoragePath(filename, checksum)

    const blob = await put(storagePath, file, {
      access: 'public',
      contentType: mimeType,
    })

    // Store the URL mapping
    this.urlMap.set(storagePath, blob.url)

    return {
      path: storagePath,
      url: blob.url,
      size: file.length,
      checksum,
      mimeType,
    }
  }

  async delete(storagePath: string): Promise<void> {
    const url = this.urlMap.get(storagePath)
    if (url) {
      await del(url)
      this.urlMap.delete(storagePath)
    }
  }

  getUrl(storagePath: string): string {
    return this.urlMap.get(storagePath) || storagePath
  }

  async read(storagePath: string): Promise<Buffer> {
    const url = this.urlMap.get(storagePath) || storagePath
    const response = await fetch(url)
    const arrayBuffer = await response.arrayBuffer()
    return Buffer.from(arrayBuffer)
  }
}

// Singleton instance
let storageInstance: StorageService | null = null

export function getStorage(): StorageService {
  if (!storageInstance) {
    storageInstance = new VercelBlobStorageService()
  }
  return storageInstance
}

export function isImage(mimeType: string): boolean {
  return mimeType.startsWith('image/')
}

export function isPdf(mimeType: string): boolean {
  return mimeType === 'application/pdf'
}
EOF