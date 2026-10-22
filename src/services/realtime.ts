import { io, type Socket } from 'socket.io-client'
import type { Incident } from '../types/incident.types'
import type { GuardianJourneyResponse, Journey } from '../types/journey.types'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL

if (!API_BASE_URL) {
  throw new Error('VITE_API_BASE_URL is missing. Add it to your .env file.')
}

const SOCKET_BASE_URL = API_BASE_URL.replace(/\/api\/?$/, '')

export type IncidentRealtimePayload = {
  incidentId: number
  userId: number
  latitude?: number | null
  longitude?: number | null
  accuracy?: number | null
  locationTimestamp?: string | null
  createdAt: string
  status: 'ACTIVE' | 'RESOLVED' | 'CANCELLED'
  resolvedByRole?: 'USER' | 'GUARDIAN' | 'ADMIN' | null
  resolutionNote?: string | null
  incident: Incident
}

export type JourneyRealtimePayload = {
  journeyId: number
  userId: number
  status: 'PLANNED' | 'ACTIVE' | 'CHECK_IN_REQUIRED' | 'COMPLETED' | 'CANCELLED' | 'ESCALATED'
  checkInRequiredAt?: string | null
  checkInExpiresAt?: string | null
  escalatedAt?: string | null
  updatedAt: string
  journey: Journey
}

export type JourneyGuardianResponseRealtimePayload = {
  journeyId: number
  userId: number
  createdAt: string
  response: GuardianJourneyResponse
}

export const createRealtimeSocket = (token: string): Socket =>
  io(SOCKET_BASE_URL, {
    transports: ['websocket'],
    auth: { token },
  })
