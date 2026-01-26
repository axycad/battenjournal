import { createHash } from 'crypto'
import { writeFile, mkdir, unlink, readFile } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'

// Storage service interface - swap implementation for S3/R2 later
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
const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads'
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
  // Check size
  if (file.length > MAX_FILE_SIZE) {
    throw new ValidationError('This file is larger than 25MB.')
  }

  // Check mime type
  if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
    throw new ValidationError(
      'Only images (JPG, PNG, HEIC) and PDFs are allowed.'
    )
  }

  // Check extension
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
  
  // Structure: /year/month/checksum-truncated.ext
  // Using checksum prefix ensures uniqueness and deduplication potential
  return `${year}/${month}/${checksum.slice(0, 16)}${ext}`
}

// Local filesystem implementation
class LocalStorageService implements StorageService {
  private baseDir: string

  constructor(baseDir: string = UPLOAD_DIR) {
    this.baseDir = baseDir
  }

  async upload(
    file: Buffer,
    filename: string,
    mimeType: string
  ): Promise<StorageResult> {
    // Validate first
    validateFile(file, filename, mimeType)

    const checksum = generateChecksum(file)
    const storagePath = generateStoragePath(filename, checksum)
    const fullPath = path.join(this.baseDir, storagePath)

    // Ensure directory exists
    const dir = path.dirname(fullPath)
    if (!existsSync(dir)) {
      await mkdir(dir, { recursive: true })
    }

    // Write file
    await writeFile(fullPath, file)

    return {
      path: storagePath,
      url: this.getUrl(storagePath),
      size: file.length,
      checksum,
      mimeType,
    }
  }

  async delete(storagePath: string): Promise<void> {
    const fullPath = path.join(this.baseDir, storagePath)
    if (existsSync(fullPath)) {
      await unlink(fullPath)
    }
  }

  getUrl(storagePath: string): string {
    // Served via API route
    return `/api/files/${storagePath}`
  }

  async read(storagePath: string): Promise<Buffer> {
    const fullPath = path.join(this.baseDir, storagePath)
    return readFile(fullPath)
  }
}

// Singleton instance
let storageInstance: StorageService | null = null

export function getStorage(): StorageService {
  if (!storageInstance) {
    storageInstance = new LocalStorageService()
  }
  return storageInstance
}

// Helper to determine if file is an image
export function isImage(mimeType: string): boolean {
  return mimeType.startsWith('image/')
}

// Helper to determine if file is a PDF
export function isPdf(mimeType: string): boolean {
  return mimeType === 'application/pdf'
}
