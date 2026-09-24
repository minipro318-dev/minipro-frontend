import { Outlet } from 'react-router-dom'

export const AuthLayout = () => (
  <div className="min-h-screen bg-brand-black px-4 py-10 text-brand-white">
    <div className="mx-auto w-full max-w-md rounded-2xl border border-brand-border bg-brand-dark p-6 shadow-brand">
      <h1 className="mb-2 text-center text-2xl font-bold">Women Safety Platform</h1>
      <p className="mb-6 text-center text-sm text-brand-muted">Secure access for Admin, Guardian and End User</p>
      <Outlet />
    </div>
  </div>
)
