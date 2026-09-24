export type UserRole = 'ADMIN' | 'GUARDIAN' | 'END_USER'

export type AuthUser = {
  id: number
  name: string
  email: string
  mobile: string | null
  role: UserRole
  status: boolean
  lastLogin: string | null
  createdAt: string
  updatedAt: string
}

export type LoginResponse = {
  message: string
  token: string
  user: AuthUser
}

export type ApiError = {
  message?: string
  details?: unknown
}

export type RegisterPayload = {
  name: string
  email: string
  mobile?: string
  password: string
  confirmPassword: string
  role: UserRole
  adminRegistrationKey?: string
}
