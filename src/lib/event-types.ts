export const EVENT_TYPES = {
  seizure: {
    label: 'Seizure activity',
    defaultScopes: ['seizures', 'meds'],
  },
  skin_wound: {
    label: 'Skin / wound observation',
    defaultScopes: ['skin_wounds', 'infection'],
  },
  infection: {
    label: 'Infection concern',
    defaultScopes: ['infection', 'meds'],
  },
  medication: {
    label: 'Medication given / changed',
    defaultScopes: ['meds'],
  },
  feeding: {
    label: 'Feeding observation',
    defaultScopes: ['feeding'],
  },
  sleep: {
    label: 'Sleep note',
    defaultScopes: ['sleep', 'comfort'],
  },
  mobility: {
    label: 'Mobility change',
    defaultScopes: ['mobility'],
  },
  vision_comm: {
    label: 'Vision / communication note',
    defaultScopes: ['vision_comm'],
  },
  comfort: {
    label: 'Comfort / pain observation',
    defaultScopes: ['comfort'],
  },
  care_admin: {
    label: 'Care admin',
    defaultScopes: ['care_admin'],
  },
  general: {
    label: 'General note',
    defaultScopes: ['other'],
  },
  daily_checkin: {
    label: 'Daily check-in',
    defaultScopes: ['other'],
  },
  nothing_new: {
    label: 'Nothing new today',
    defaultScopes: [],
  },
} as const

export type EventType = keyof typeof EVENT_TYPES

// Severity levels for events (1-4)
export const SEVERITY_LEVELS = {
  MINIMAL: 1,
  MILD: 2,
  MODERATE: 3,
  SEVERE: 4,
} as const

export type SeverityLevel = (typeof SEVERITY_LEVELS)[keyof typeof SEVERITY_LEVELS]

export const SEVERITY_LABELS: Record<SeverityLevel, string> = {
  1: 'Minimal',
  2: 'Mild',
  3: 'Moderate',
  4: 'Severe',
}

export const SEVERITY_COLORS: Record<SeverityLevel, string> = {
  1: 'bg-gray-200 text-gray-700', // Minimal - light gray
  2: 'bg-amber-100 text-amber-700', // Mild - amber
  3: 'bg-orange-200 text-orange-800', // Moderate - orange
  4: 'bg-red-200 text-red-800', // Severe - red
}
