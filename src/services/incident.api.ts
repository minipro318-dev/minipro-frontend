import type { ApiError } from '../types/auth.types'
import type { Incident } from '../types/incident.types'

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

export const incidentApi = {
  list: (token: string) => request<{ incidents: Incident[] }>('/incidents', token),
  getById: (token: string, incidentId: number) =>
    request<{ incident: Incident }>(`/incidents/${incidentId}`, token),
  triggerSos: (
    token: string,
    payload: {
      title?: string
      description?: string
      latitude: number
      longitude: number
      accuracy?: number
      locationTimestamp?: string
      address?: string
    },
  ) =>
    request<{ message: string; incident: Incident }>('/incidents/sos', token, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }),
  addLocation: (
    token: string,
    incidentId: number,
    payload: { latitude: number; longitude: number; accuracy?: number; locationTimestamp?: string; address?: string },
  ) =>
    request<{ message: string; incident: Incident }>(`/incidents/${incidentId}/locations`, token, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }),
  resolve: (token: string, incidentId: number) =>
    request<{ message: string; incident: Incident }>(`/incidents/${incidentId}/resolve`, token, {
      method: 'PATCH',
    }),
  cancel: (token: string, incidentId: number) =>
    request<{ message: string; incident: Incident }>(`/incidents/${incidentId}/cancel`, token, {
      method: 'PATCH',
    }),
}
