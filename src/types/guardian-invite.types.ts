export type GuardianInviteStatus = 'PENDING' | 'ACCEPTED' | 'EXPIRED' | 'CANCELLED'

export type GuardianInvite = {
  id: number
  invitedById: number
  guardianName: string
  guardianEmail: string
  guardianMobile: string
  inviteCode: string
  status: GuardianInviteStatus
  expiresAt: string
  acceptedAt: string | null
  createdAt: string
  updatedAt: string
}

export type LinkedGuardian = {
  id: number
  name: string
  email: string
  mobile: string | null
  role: 'GUARDIAN'
  status: boolean
  linkedAt: string
}
