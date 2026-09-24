import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export const PublicRoute = () => {
  const { user, isLoading, homePath } = useAuth()

  if (isLoading) return null

  if (user) {
    return <Navigate to={homePath} replace />
  }

  return <Outlet />
}
