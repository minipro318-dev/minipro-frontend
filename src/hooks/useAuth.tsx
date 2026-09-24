import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { authApi } from '../services/auth.api'
import type { AuthUser, LoginResponse, UserRole } from '../types/auth.types'

const TOKEN_KEY = 'safety_access_token'
const USER_KEY = 'safety_user'

type AuthContextValue = {
  user: AuthUser | null
  token: string | null
  isLoading: boolean
  login: (data: LoginResponse) => void
  logout: () => Promise<void>
  homePath: string
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

const getHomePathForRole = (role?: UserRole) => {
  if (role === 'ADMIN') return '/dashboard/admin/overview'
  if (role === 'GUARDIAN') return '/dashboard/guardian/overview'
  return '/dashboard/user/overview'
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const hydrate = async () => {
      const storedToken = localStorage.getItem(TOKEN_KEY)
      const storedUser = localStorage.getItem(USER_KEY)

      if (!storedToken) {
        setIsLoading(false)
        return
      }

      if (storedUser) {
        try {
          setUser(JSON.parse(storedUser) as AuthUser)
        } catch {
          localStorage.removeItem(USER_KEY)
        }
      }

      try {
        const { user: currentUser } = await authApi.me(storedToken)
        setToken(storedToken)
        setUser(currentUser)
        localStorage.setItem(USER_KEY, JSON.stringify(currentUser))
      } catch {
        localStorage.removeItem(TOKEN_KEY)
        localStorage.removeItem(USER_KEY)
        setToken(null)
        setUser(null)
      } finally {
        setIsLoading(false)
      }
    }

    void hydrate()
  }, [])

  const login = useCallback((data: LoginResponse) => {
    localStorage.setItem(TOKEN_KEY, data.token)
    localStorage.setItem(USER_KEY, JSON.stringify(data.user))
    setToken(data.token)
    setUser(data.user)
  }, [])

  const logout = useCallback(async () => {
    try {
      await authApi.logout()
    } finally {
      localStorage.removeItem(TOKEN_KEY)
      localStorage.removeItem(USER_KEY)
      setToken(null)
      setUser(null)
    }
  }, [])

  const homePath = getHomePathForRole(user?.role)

  const value = useMemo(
    () => ({
      user,
      token,
      isLoading,
      login,
      logout,
      homePath,
    }),
    [user, token, isLoading, login, logout, homePath],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider.')
  }
  return context
}
