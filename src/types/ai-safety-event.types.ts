import type { Incident } from './incident.types'

export type AiSafetyEventStatus =
  | 'DETECTED'
  | 'AWAITING_CONFIRMATION'
  | 'ACKNOWLEDGED'
  | 'FALSE_ALARM'
  | 'ESCALATED'
  | 'EXPIRED'
  | 'CANCELLED'

export type AiSafetyEvent = {
  id: number
  userId: number
  eventType: string
  status: AiSafetyEventStatus
  detectedAt: string
  modelProvider: string
  modelVersion: string
  classifierType: string
  classifierScore: number | null
  classifierConfidence: number | null
  confidenceLabel: string | null
  lastKnownLatitude: number | null
  lastKnownLongitude: number | null
  lastKnownAccuracy: number | null
  lastKnownAddress: string | null
  confirmationDeadline: string | null
  userResponse: string | null
  responseReason: string | null
  respondedAt: string | null
  notificationError: string | null
  notifiedAt: string | null
  linkedIncidentId: number | null
  escalationReason: string | null
  escalatedAt: string | null
  escalatedById: number | null
  createdAt: string
  updatedAt: string
  user: {
    id: number
    name: string
    email: string
    mobile: string | null
    role: 'ADMIN' | 'GUARDIAN' | 'END_USER'
  }
  linkedIncident: Incident | null
}

export type AiSafetyRealtimePayload = {
  eventId: number
  userId: number
  status: AiSafetyEventStatus
  detectedAt: string
  confirmationDeadline?: string | null
  escalatedAt?: string | null
  linkedIncidentId?: number | null
  event: AiSafetyEvent
}
