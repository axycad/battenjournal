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

// Clinician share/membership
export interface ClinicianShare {
  id: string
  userId: string
  caseId: string
  user: {
    id: string
    name: string | null
    email: string
  }
  grantedScopes: Array<{
    code: string
    label: string
  }>
  status: 'ACTIVE' | 'PAUSED' | 'REVOKED'
  specialty: string | null
  createdAt: Date
}

export async function getPendingClinicianInvitesAPI(caseId: string): Promise<ClinicianInvite[]> {
  const params = new URLSearchParams({ caseId })
  return apiClient.get(`/api/sharing/invites?${params.toString()}`)
}

// Create family invite
export async function createInviteAPI(data: {
  caseId: string
  email: string
  familyRole: 'PARENT' | 'SIBLING' | 'GRANDPARENT' | 'OTHER_FAMILY'
}): Promise<{ success: boolean; error?: string }> {
  return apiClient.post('/api/invites/create', data)
}

// Cancel a pending invite
export async function cancelInviteAPI(inviteId: string): Promise<{ success: boolean; error?: string }> {
  return apiClient.post(`/api/invites/${inviteId}/cancel`)
}

// Revoke a membership
export async function revokeMembershipAPI(membershipId: string): Promise<{ success: boolean; error?: string }> {
  return apiClient.post(`/api/invites/membership/${membershipId}/revoke`)
}

// Create clinician invite
export async function createClinicianInviteAPI(data: {
  caseId: string
  email: string
  specialty?: string
  scopes?: string[]
}): Promise<{ success: boolean; error?: string }> {
  return apiClient.post('/api/sharing/invite', data)
}

// Update clinician scopes
export async function updateClinicianScopesAPI(
  membershipId: string,
  scopes: string[]
): Promise<{ success: boolean; error?: string }> {
  return apiClient.post(`/api/sharing/membership/${membershipId}/scopes`, { scopes })
}

// Pause clinician access
export async function pauseClinicianAccessAPI(membershipId: string): Promise<{ success: boolean; error?: string }> {
  return apiClient.post(`/api/sharing/membership/${membershipId}/pause`)
}

// Resume clinician access
export async function resumeClinicianAccessAPI(membershipId: string): Promise<{ success: boolean; error?: string }> {
  return apiClient.post(`/api/sharing/membership/${membershipId}/resume`)
}

// Revoke clinician access
export async function revokeClinicianAccessAPI(membershipId: string): Promise<{ success: boolean; error?: string }> {
  return apiClient.post(`/api/sharing/membership/${membershipId}/revoke`)
}

// Accept a family invite
export async function acceptInviteAPI(token: string): Promise<{ success: boolean; caseId?: string; error?: string }> {
  return apiClient.post(`/api/invites/accept`, { token })
}

// Accept a clinician invite
export async function acceptClinicianInviteAPI(token: string): Promise<{ success: boolean; caseId?: string; error?: string }> {
  return apiClient.post(`/api/sharing/accept`, { token })
}

// Get invite details by token
export async function getInviteByTokenAPI(token: string): Promise<{ invite: Invite; case: any }> {
  return apiClient.get(`/api/invites/${token}`, { requireAuth: false })
}

// Get clinician invite details by token
export async function getClinicianInviteByTokenAPI(token: string): Promise<{ invite: ClinicianInvite; case: any }> {
  return apiClient.get(`/api/sharing/invites/${token}`, { requireAuth: false })
}

// Server component aliases
export const getInviteByToken = getInviteByTokenAPI
export const getClinicianInviteByToken = getClinicianInviteByTokenAPI
