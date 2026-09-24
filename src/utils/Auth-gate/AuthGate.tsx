import { BrowserRouter } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { AppRoutes } from '../../routes'

export const AuthGate = () => {
  const { isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="grid min-h-screen place-items-center bg-brand-black text-brand-white">
        <div className="rounded-lg border border-brand-border bg-brand-dark px-4 py-3">Loading authentication...</div>
      </div>
    )
  }

  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  )
}
