import type { ApiError, LoginResponse } from '../types/auth.types'
import type { GuardianInvite, LinkedGuardian } from '../types/guardian-invite.types'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL

if (!API_BASE_URL) {
  throw new Error('VITE_API_BASE_URL is missing. Add it to your .env file.')
}

const request = async <T>(path: string, options: RequestInit = {}): Promise<T> => {
  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      credentials: 'include',
      ...options,
      headers: { ...options.headers },
    })
    const data = await response.json().catch(() => ({}))
    if (!response.ok) throw data as ApiError
    return data as T
  } catch (error) {
    if (error instanceof TypeError) {
      throw { message: 'Cannot reach server. Please start backend and try again.' } as ApiError
    }
    throw error
  }
}

export const guardianInviteApi = {
  create: (
    token: string,
    payload: { guardianName: string; guardianEmail: string; guardianMobile: string },
  ) =>
    request<{ message: string; invite: GuardianInvite }>('/guardian-invites', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    }),
  list: (token: string) =>
    request<{ invites: GuardianInvite[] }>('/guardian-invites', {
      headers: { Authorization: `Bearer ${token}` },
    }),
  listLinked: (token: string) =>
    request<{ guardians: LinkedGuardian[] }>('/guardian-invites/linked', {
      headers: { Authorization: `Bearer ${token}` },
    }),
  updateLinked: (
    token: string,
    guardianId: number,
    payload: { guardianName?: string; guardianEmail?: string; guardianMobile?: string },
  ) =>
    request<{ message: string; guardian: LinkedGuardian }>(`/guardian-invites/linked/${guardianId}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    }),
  removeLinked: (token: string, guardianId: number) =>
    request<{ message: string }>(`/guardian-invites/linked/${guardianId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    }),
  accept: (payload: {
    inviteCode: string
    guardianName: string
    guardianEmail: string
    guardianMobile: string
    password: string
    confirmPassword: string
  }) =>
    request<LoginResponse & { invite: GuardianInvite }>('/guardian-invites/accept', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }),
}
