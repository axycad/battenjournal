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
