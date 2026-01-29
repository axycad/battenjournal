// Export all API modules
export * from './events'
export * from './cases'
export * from './profile'
export * from './tasks'
export * from './documents'
export * from './notifications'
export * from './appointments'
export * from './clinical'
export * from './messaging'

// Re-export the API client and error class
export { apiClient, ApiError } from '../api-client'
