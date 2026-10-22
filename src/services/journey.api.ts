import type { ApiError } from '../types/auth.types'
import type {
  GuardianJourneyResponse,
  Journey,
  JourneyDestinationReverse,
  JourneyDestinationSuggestion,
  JourneyRoutePreview,
  JourneyStatus,
} from '../types/journey.types'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL

if (!API_BASE_URL) {
  throw new Error('VITE_API_BASE_URL is missing. Add it to your .env file.')
}

const request = async <T>(path: string, token: string, options: RequestInit = {}): Promise<T> => {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    credentials: 'include',
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  })

  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw data as ApiError
  }
  return data as T
}

export const journeyApi = {
  searchDestinations: (token: string, query: string, limit = 5) =>
    request<{ suggestions: JourneyDestinationSuggestion[] }>(
      `/journeys/destination-search?query=${encodeURIComponent(query)}&limit=${limit}`,
      token,
    ),
  reverseDestination: (token: string, latitude: number, longitude: number) =>
    request<{ destination: JourneyDestinationReverse }>(
      `/journeys/destination-reverse?latitude=${encodeURIComponent(latitude)}&longitude=${encodeURIComponent(longitude)}`,
      token,
    ),
  preview: (
    token: string,
    payload: {
      originLatitude: number
      originLongitude: number
      destinationLatitude: number
      destinationLongitude: number
      destinationName: string
    },
  ) =>
    request<{ message: string; route: JourneyRoutePreview }>('/journeys/preview', token, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }),
  start: (
    token: string,
    payload: {
      title?: string
      originLatitude: number
      originLongitude: number
      destinationLatitude: number
      destinationLongitude: number
      destinationName: string
      accuracy?: number
      locationTimestamp?: string
      address?: string
    },
  ) =>
    request<{ message: string; journey: Journey }>('/journeys', token, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }),
  list: (token: string, status?: JourneyStatus) =>
    request<{ journeys: Journey[] }>(`/journeys${status ? `?status=${encodeURIComponent(status)}` : ''}`, token),
  getById: (token: string, journeyId: number) => request<{ journey: Journey }>(`/journeys/${journeyId}`, token),
  listGuardianResponses: (token: string, journeyId: number) =>
    request<{ responses: GuardianJourneyResponse[] }>(`/journeys/${journeyId}/guardian-responses`, token),
  sendGuardianResponse: (
    token: string,
    journeyId: number,
    payload: { messageTemplateKey?: string; customMessage?: string },
  ) =>
    request<{ message: string; response: GuardianJourneyResponse }>(`/journeys/${journeyId}/guardian-responses`, token, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }),
  addLocation: (
    token: string,
    journeyId: number,
    payload: { latitude: number; longitude: number; accuracy?: number; locationTimestamp?: string; address?: string },
  ) =>
    request<{ message: string; journey: Journey }>(`/journeys/${journeyId}/locations`, token, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }),
  confirmSafety: (token: string, journeyId: number, payload?: { note?: string }) =>
    request<{ message: string; journey: Journey }>(`/journeys/${journeyId}/confirm-safety`, token, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload ?? {}),
    }),
  complete: (token: string, journeyId: number) =>
    request<{ message: string; journey: Journey }>(`/journeys/${journeyId}/complete`, token, {
      method: 'PATCH',
    }),
  cancel: (token: string, journeyId: number, payload?: { reason?: string }) =>
    request<{ message: string; journey: Journey }>(`/journeys/${journeyId}/cancel`, token, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload ?? {}),
    }),
}
