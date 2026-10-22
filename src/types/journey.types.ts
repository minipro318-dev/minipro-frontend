import type { Incident } from './incident.types'

export type JourneyStatus = 'PLANNED' | 'ACTIVE' | 'CHECK_IN_REQUIRED' | 'COMPLETED' | 'CANCELLED' | 'ESCALATED'
export type JourneyDestinationSuggestion = {
  placeId: string
  displayName: string
  latitude: number
  longitude: number
}

export type JourneyEventType =
  | 'JOURNEY_CREATED'
  | 'JOURNEY_STARTED'
  | 'LOCATION_RECORDED'
  | 'DEVIATION_DETECTED'
  | 'CHECK_IN_REQUIRED'
  | 'SAFETY_CONFIRMED'
  | 'GUARDIAN_RESPONSE_SENT'
  | 'JOURNEY_COMPLETED'
  | 'JOURNEY_CANCELLED'
  | 'ESCALATED_TO_SOS'

export type JourneyActor = {
  id: number
  name: string
  email: string
  mobile?: string | null
  role: 'ADMIN' | 'GUARDIAN' | 'END_USER'
}

export type JourneyLocation = {
  id: number
  latitude: number
  longitude: number
  accuracy: number | null
  address: string | null
  locationTimestamp: string
  source: string
  createdAt: string
}

export type JourneyEvent = {
  id: number
  eventType: JourneyEventType
  message: string
  actorRole: 'ADMIN' | 'GUARDIAN' | 'END_USER' | null
  actorId: number | null
  metadata: Record<string, unknown> | null
  createdAt: string
}

export type GuardianJourneyResponse = {
  id: number
  journeyId: number
  incidentId: number | null
  guardianId: number
  endUserId: number
  message: string
  messageTemplateKey: string | null
  deliveredViaRealtime: boolean
  deliveryError: string | null
  createdAt: string
  guardian: JourneyActor
}

export type Journey = {
  id: number
  title: string
  destinationName: string
  destinationLatitude: number
  destinationLongitude: number
  status: JourneyStatus
  plannedById: number
  startedAt: string | null
  completedAt: string | null
  cancelledAt: string | null
  endedAt: string | null
  expectedArrivalAt: string | null
  routePolyline: string | null
  routeDistanceMeters: number | null
  routeDurationSeconds: number | null
  currentLatitude: number | null
  currentLongitude: number | null
  currentAccuracy: number | null
  currentAddress: string | null
  currentLocationAt: string | null
  offRouteCount: number
  checkInReason: string | null
  checkInRequiredAt: string | null
  checkInExpiresAt: string | null
  checkInAcknowledgedAt: string | null
  escalatedAt: string | null
  escalationIncidentId: number | null
  lastEscalationNotifiedAt: string | null
  lastEscalationNotificationError: string | null
  createdAt: string
  updatedAt: string
  plannedBy: JourneyActor
  locations: JourneyLocation[]
  events: JourneyEvent[]
  guardianResponses: GuardianJourneyResponse[]
  escalationIncident: Incident | null
}

export type JourneyRoutePreview = {
  destinationName: string
  distanceMeters: number | null
  walkingDurationSeconds: number | null
  walkingDurationText: string | null
  encodedPolyline: string | null
  navigateUrl: string
}

export type JourneyDestinationReverse = {
  displayName: string | null
  latitude: number
  longitude: number
}
