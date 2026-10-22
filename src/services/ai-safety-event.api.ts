import type { ApiError } from '../types/auth.types'
import type { AiSafetyEvent } from '../types/ai-safety-event.types'

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

export const aiSafetyEventApi = {
  detect: (
    token: string,
    payload: {
      eventType?: string
      modelProvider?: string
      modelVersion?: string
      classifierType?: string
      classifierScore?: number
      classifierConfidence?: number
      confidenceLabel?: string
      detectedAt?: string
      latitude?: number
      longitude?: number
      accuracy?: number
      locationAddress?: string
    },
  ) =>
    request<{ message: string; event: AiSafetyEvent }>('/ai-safety-events/detect', token, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }),
  list: (token: string, params?: { status?: string; limit?: number }) => {
    const search = new URLSearchParams()
    if (params?.status) search.set('status', params.status)
    if (params?.limit) search.set('limit', String(params.limit))
    const query = search.toString() ? `?${search.toString()}` : ''
    return request<{ events: AiSafetyEvent[] }>(`/ai-safety-events${query}`, token)
  },
  getById: (token: string, id: number) => request<{ event: AiSafetyEvent }>(`/ai-safety-events/${id}`, token),
  acknowledge: (token: string, id: number, reason?: string) =>
    request<{ message: string; event: AiSafetyEvent }>(`/ai-safety-events/${id}/acknowledge`, token, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason }),
    }),
  falseAlarm: (token: string, id: number, reason?: string) =>
    request<{ message: string; event: AiSafetyEvent }>(`/ai-safety-events/${id}/false-alarm`, token, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason }),
    }),
  requestHelp: (token: string, id: number, reason?: string) =>
    request<{ message: string; event: AiSafetyEvent }>(`/ai-safety-events/${id}/request-help`, token, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason }),
    }),
  adminStats: (token: string) => request<{ stats: { total: number; pending: number; escalated: number; falseAlarms: number } }>('/ai-safety-events/admin/stats', token),
}
