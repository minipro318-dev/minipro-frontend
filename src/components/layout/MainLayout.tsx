import { Link, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'

export const MainLayout = () => {
  const { user, logout, homePath } = useAuth()
  const navigate = useNavigate()

  const onLogout = async () => {
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="min-h-screen bg-brand-black text-brand-white">
      <header className="border-b border-brand-border bg-brand-dark">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4">
          <div>
            <p className="text-lg font-bold">Women Safety Platform</p>
            <p className="text-xs text-brand-muted">Logged in as {user?.name} ({user?.role})</p>
          </div>
          <div className="flex items-center gap-3">
            <Link className="rounded-md border border-brand-border px-3 py-1 text-sm hover:bg-brand-pink hover:text-brand-black" to={homePath}>
              Dashboard
            </Link>
            <button
              className="cursor-pointer rounded-md bg-brand-peach px-3 py-1 text-sm font-semibold text-brand-black hover:bg-brand-pink"
              onClick={onLogout}
              type="button"
            >
              Logout
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  )
}
