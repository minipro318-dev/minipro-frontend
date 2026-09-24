import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import type { UserRole } from '../types/auth.types'

type RoleRouteProps = {
  allow: UserRole[]
}

export const RoleRoute = ({ allow }: RoleRouteProps) => {
  const { user, homePath } = useAuth()

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (!allow.includes(user.role)) {
    return <Navigate to={homePath} replace />
  }

  return <Outlet />
}
