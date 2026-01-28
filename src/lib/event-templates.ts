import { SEVERITY_LEVELS, type SeverityLevel } from './event-types'

/**
 * Field types supported by event templates
 */
export type EventFieldType = 'text' | 'number' | 'select' | 'checkbox' | 'duration' | 'textarea'

/**
 * Field definition for event templates
 */
export interface EventField {
  id: string
  label: string
  type: EventFieldType
  required?: boolean
  placeholder?: string
  options?: string[] // For select type
  unit?: string // For number type (e.g., "minutes", "mg")
  min?: number // For number type
  max?: number // For number type
  rows?: number // For textarea type
  defaultValue?: string | number | boolean
}

/**
 * Event template configuration
 */
export interface EventTemplateConfig {
  type: string
  label: string
  emoji?: string
  defaultSeverity: SeverityLevel
  defaultScopes: string[] // Scope codes
  quickFields?: EventField[] // Fields shown in quick-log mode
  detailedFields?: EventField[] // Fields shown in expanded mode
  frequencyThreshold?: number // Alert if events per day exceeds this
  requiresSeverity?: boolean // Whether severity is required
}

/**
 * Complete event template from database
 */
export interface EventTemplate {
  id: string
  type: string
  label: string
  emoji?: string | null
  defaultSeverity: number
  configuration: EventTemplateConfig
  active: boolean
  order: number
  createdAt: Date
  updatedAt: Date
}

/**
 * Validate event template configuration
 */
export function validateTemplateConfig(config: unknown): config is EventTemplateConfig {
  if (typeof config !== 'object' || config === null) return false

  const c = config as Record<string, unknown>

  // Required fields
  if (typeof c.type !== 'string') return false
  if (typeof c.label !== 'string') return false
  if (typeof c.defaultSeverity !== 'number') return false
  if (!Array.isArray(c.defaultScopes)) return false

  // Optional fields
  if (c.quickFields !== undefined && !Array.isArray(c.quickFields)) return false
  if (c.detailedFields !== undefined && !Array.isArray(c.detailedFields)) return false
  if (c.frequencyThreshold !== undefined && typeof c.frequencyThreshold !== 'number')
    return false
  if (c.requiresSeverity !== undefined && typeof c.requiresSeverity !== 'boolean') return false

  return true
}

/**
 * Create default template configuration for existing event types
 */
export function createDefaultTemplate(
  type: string,
  label: string,
  defaultScopes: string[],
  options?: {
    emoji?: string
    defaultSeverity?: SeverityLevel
    quickFields?: EventField[]
    detailedFields?: EventField[]
    frequencyThreshold?: number
    requiresSeverity?: boolean
  }
): EventTemplateConfig {
  return {
    type,
    label,
    emoji: options?.emoji,
    defaultSeverity: options?.defaultSeverity ?? SEVERITY_LEVELS.MILD,
    defaultScopes,
    quickFields: options?.quickFields,
    detailedFields: options?.detailedFields,
    frequencyThreshold: options?.frequencyThreshold,
    requiresSeverity: options?.requiresSeverity ?? true,
  }
}

/**
 * Get all fields for a template (quick + detailed)
 */
export function getAllFields(config: EventTemplateConfig): EventField[] {
  return [...(config.quickFields || []), ...(config.detailedFields || [])]
}

/**
 * Get field by ID from template
 */
export function getFieldById(
  config: EventTemplateConfig,
  fieldId: string
): EventField | undefined {
  return getAllFields(config).find((field) => field.id === fieldId)
}

/**
 * Validate field value against field definition
 */
export function validateFieldValue(
  field: EventField,
  value: unknown
): { valid: boolean; error?: string } {
  // Check required
  if (field.required && (value === undefined || value === null || value === '')) {
    return { valid: false, error: `${field.label} is required` }
  }

  // Skip validation if not required and empty
  if (!field.required && (value === undefined || value === null || value === '')) {
    return { valid: true }
  }

  // Type-specific validation
  switch (field.type) {
    case 'text':
    case 'textarea':
      if (typeof value !== 'string') {
        return { valid: false, error: `${field.label} must be text` }
      }
      break

    case 'number':
    case 'duration':
      if (typeof value !== 'number') {
        return { valid: false, error: `${field.label} must be a number` }
      }
      if (field.min !== undefined && value < field.min) {
        return { valid: false, error: `${field.label} must be at least ${field.min}` }
      }
      if (field.max !== undefined && value > field.max) {
        return { valid: false, error: `${field.label} must be at most ${field.max}` }
      }
      break

    case 'checkbox':
      if (typeof value !== 'boolean') {
        return { valid: false, error: `${field.label} must be true or false` }
      }
      break

    case 'select':
      if (typeof value !== 'string') {
        return { valid: false, error: `${field.label} must be a selection` }
      }
      if (field.options && !field.options.includes(value)) {
        return { valid: false, error: `${field.label} has an invalid option` }
      }
      break
  }

  return { valid: true }
}

/**
 * Default templates for all existing event types
 * These will be used for seeding the database
 */
export const DEFAULT_TEMPLATES: EventTemplateConfig[] = [
  createDefaultTemplate('seizure', 'Seizure activity', ['seizures', 'meds'], {
    emoji: '⚡',
    defaultSeverity: SEVERITY_LEVELS.MODERATE,
    quickFields: [
      {
        id: 'duration',
        label: 'Duration',
        type: 'number',
        unit: 'minutes',
        min: 0,
        placeholder: 'How long in minutes?',
      },
    ],
    detailedFields: [
      {
        id: 'rescueMed',
        label: 'Rescue medication given',
        type: 'checkbox',
        defaultValue: false,
      },
      {
        id: 'triggers',
        label: 'Possible triggers',
        type: 'textarea',
        rows: 2,
        placeholder: 'What might have triggered this?',
      },
    ],
    frequencyThreshold: 3,
  }),

  createDefaultTemplate('skin_wound', 'Skin / wound observation', ['skin_wounds', 'infection'], {
    emoji: '🩹',
    defaultSeverity: SEVERITY_LEVELS.MILD,
    quickFields: [
      {
        id: 'location',
        label: 'Location',
        type: 'text',
        placeholder: 'Where on body?',
      },
    ],
    detailedFields: [
      {
        id: 'woundType',
        label: 'Type',
        type: 'select',
        options: ['Pressure sore', 'Cut/scrape', 'Rash', 'Other'],
      },
      {
        id: 'treatment',
        label: 'Treatment applied',
        type: 'textarea',
        rows: 2,
      },
    ],
  }),

  createDefaultTemplate('infection', 'Infection concern', ['infection', 'meds'], {
    emoji: '🦠',
    defaultSeverity: SEVERITY_LEVELS.MODERATE,
    quickFields: [
      {
        id: 'symptoms',
        label: 'Symptoms',
        type: 'textarea',
        rows: 2,
        placeholder: 'What symptoms are present?',
      },
    ],
    detailedFields: [
      {
        id: 'temperature',
        label: 'Temperature',
        type: 'number',
        unit: '°F',
        min: 95,
        max: 107,
      },
    ],
    frequencyThreshold: 2,
  }),

  createDefaultTemplate('medication', 'Medication given / changed', ['meds'], {
    emoji: '💊',
    defaultSeverity: SEVERITY_LEVELS.MINIMAL,
    requiresSeverity: false,
  }),

  createDefaultTemplate('feeding', 'Feeding observation', ['feeding'], {
    emoji: '🍽️',
    defaultSeverity: SEVERITY_LEVELS.MILD,
  }),

  createDefaultTemplate('sleep', 'Sleep note', ['sleep', 'comfort'], {
    emoji: '😴',
    defaultSeverity: SEVERITY_LEVELS.MILD,
    quickFields: [
      {
        id: 'duration',
        label: 'Duration',
        type: 'number',
        unit: 'hours',
        min: 0,
        max: 24,
      },
    ],
  }),

  createDefaultTemplate('mobility', 'Mobility change', ['mobility'], {
    emoji: '🚶',
    defaultSeverity: SEVERITY_LEVELS.MILD,
  }),

  createDefaultTemplate('vision_comm', 'Vision / communication note', ['vision_comm'], {
    emoji: '👁️',
    defaultSeverity: SEVERITY_LEVELS.MILD,
  }),

  createDefaultTemplate('comfort', 'Comfort / pain observation', ['comfort'], {
    emoji: '😔',
    defaultSeverity: SEVERITY_LEVELS.MODERATE,
  }),

  createDefaultTemplate('care_admin', 'Care admin', ['care_admin'], {
    emoji: '📋',
    defaultSeverity: SEVERITY_LEVELS.MINIMAL,
    requiresSeverity: false,
  }),

  createDefaultTemplate('general', 'General note', ['other'], {
    emoji: '📝',
    defaultSeverity: SEVERITY_LEVELS.MINIMAL,
    requiresSeverity: false,
  }),

  createDefaultTemplate('daily_checkin', 'Daily check-in', ['other'], {
    emoji: '✅',
    defaultSeverity: SEVERITY_LEVELS.MINIMAL,
    requiresSeverity: false,
  }),

  createDefaultTemplate('nothing_new', 'Nothing new today', [], {
    emoji: '☀️',
    defaultSeverity: SEVERITY_LEVELS.MINIMAL,
    requiresSeverity: false,
  }),
]
