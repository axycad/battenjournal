// Export all API modules
export * from './events'
export * from './cases'
export * from './profile'
export * from './tasks'
export * from './documents'
export * from './notifications'

// Re-export the API client and error class
export { apiClient, ApiError } from '../api-client'
