import type { ApiError } from '../types/auth.types'
import type { NearbyHelpPlace, NearbyHelpRoute } from '../types/nearby-help.types'

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

export const nearbyHelpApi = {
  list: (token: string, latitude: number, longitude: number) =>
    request<{ places: NearbyHelpPlace[] }>(
      `/nearby-help?latitude=${encodeURIComponent(String(latitude))}&longitude=${encodeURIComponent(String(longitude))}`,
      token,
    ),
  getRoute: (
    token: string,
    payload: {
      originLatitude: number
      originLongitude: number
      destinationLatitude: number
      destinationLongitude: number
      destinationName: string
    },
  ) =>
    request<{ route: NearbyHelpRoute }>('/nearby-help/route', token, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }),
}

