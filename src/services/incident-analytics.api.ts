import type { ApiError } from '../types/auth.types'
import type { SafetyAnalyticsFilters, SafetyAnalyticsResponse } from '../types/incident-analytics.types'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL

if (!API_BASE_URL) {
  throw new Error('VITE_API_BASE_URL is missing. Add it to your .env file.')
}

const request = async <T>(path: string, token: string): Promise<T> => {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    credentials: 'include',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw data as ApiError
  }
  return data as T
}

const queryString = (filters: SafetyAnalyticsFilters) => {
  const params = new URLSearchParams()
  if (filters.startDate) params.set('startDate', filters.startDate)
  if (filters.endDate) params.set('endDate', filters.endDate)
  if (filters.status) params.set('status', filters.status)
  if (filters.category) params.set('category', filters.category)
  if (filters.timeOfDay && filters.timeOfDay !== 'ALL') params.set('timeOfDay', filters.timeOfDay)
  if (filters.granularity) params.set('granularity', filters.granularity)
  if (typeof filters.cellSize === 'number') params.set('cellSize', String(filters.cellSize))
  if (filters.sliderEndAt) params.set('sliderEndAt', filters.sliderEndAt)
  if (typeof filters.minLat === 'number') params.set('minLat', String(filters.minLat))
  if (typeof filters.maxLat === 'number') params.set('maxLat', String(filters.maxLat))
  if (typeof filters.minLng === 'number') params.set('minLng', String(filters.minLng))
  if (typeof filters.maxLng === 'number') params.set('maxLng', String(filters.maxLng))
  const query = params.toString()
  return query ? `?${query}` : ''
}

export const incidentAnalyticsApi = {
  get: (token: string, filters: SafetyAnalyticsFilters) =>
    request<SafetyAnalyticsResponse>(`/incidents/analytics${queryString(filters)}`, token),

  async downloadCsv(token: string, filters: SafetyAnalyticsFilters): Promise<Blob> {
    const response = await fetch(`${API_BASE_URL}/incidents/analytics/export.csv${queryString(filters)}`, {
      credentials: 'include',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
    if (!response.ok) {
      const data = await response.json().catch(() => ({}))
      throw (data as ApiError) || new Error('Failed to download analytics report.')
    }
    return response.blob()
  },
}
