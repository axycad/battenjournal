import { apiClient } from '@/lib/api-client'

// Family invites
export interface Invite {
  id: string
  caseId: string
  email: string
  familyRole: string
  status: string
  createdAt: Date
  invitedById: string
  invitedBy: {
    id: string
    name: string | null
  }
}

export async function getPendingInvitesAPI(caseId: string): Promise<Invite[]> {
  const params = new URLSearchParams({ caseId })
  return apiClient.get(`/api/invites/pending?${params.toString()}`)
}

// Clinician invites
export interface ClinicianInvite {
  id: string
  caseId: string
  email: string
  specialty: string | null
  status: string
  createdAt: Date
  invitedById: string
  invitedBy: {
    id: string
    name: string | null
  }
}

export async function getPendingClinicianInvitesAPI(caseId: string): Promise<ClinicianInvite[]> {
  const params = new URLSearchParams({ caseId })
  return apiClient.get(`/api/sharing/invites?${params.toString()}`)
}
