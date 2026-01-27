export const SPECIALTIES = {
  gp: {
    label: 'GP / Primary Care',
    defaultScopes: ['infection', 'meds', 'feeding', 'sleep', 'comfort', 'care_admin'],
  },
  neurology: {
    label: 'Neurology',
    defaultScopes: ['seizures', 'meds', 'sleep', 'vision_comm', 'mobility', 'comfort'],
  },
  dermatology: {
    label: 'Dermatology / Wound Care',
    defaultScopes: ['skin_wounds', 'infection', 'meds', 'comfort'],
  },
  epilepsy_nurse: {
    label: 'Epilepsy Nurse',
    defaultScopes: ['seizures', 'meds', 'sleep', 'comfort'],
  },
  gastro: {
    label: 'Gastro / Dietetics / SLT',
    defaultScopes: ['feeding', 'infection', 'meds'],
  },
  physio: {
    label: 'Physio / OT',
    defaultScopes: ['mobility', 'comfort', 'care_admin'],
  },
  ophthalmology: {
    label: 'Ophthalmology',
    defaultScopes: ['vision_comm', 'mobility'],
  },
  palliative: {
    label: 'Palliative Care',
    defaultScopes: ['comfort', 'meds', 'feeding', 'sleep', 'care_admin'],
  },
  other: {
    label: 'Other Specialist',
    defaultScopes: ['care_admin'],
  },
} as const

export type Specialty = keyof typeof SPECIALTIES
