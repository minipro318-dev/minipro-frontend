import { Outlet, useLocation } from 'react-router-dom'

export const AuthLayout = () => {
  const location = useLocation()
  const isLoginPage = location.pathname === '/login'
  const isRegisterPage = location.pathname === '/register'
  const usePremiumAuthLayout = isLoginPage || isRegisterPage

  if (usePremiumAuthLayout) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#fff7fb] via-white to-[#ffe9f4] p-4 text-brand-text md:p-6">
        <div className="mx-auto grid min-h-[calc(100vh-2rem)] w-full max-w-7xl overflow-hidden rounded-3xl border border-[var(--color-brand-border)] bg-white shadow-[0_30px_80px_rgba(205,22,119,0.16)] lg:grid-cols-[1.2fr_1fr]">
          <section className="relative flex min-h-[320px] items-end overflow-hidden bg-gradient-to-br from-[var(--color-brand-pink-soft)] via-[#ffe6f2] to-[#ffd8ea] p-6 md:p-10">
            <img
              alt="Happy confident women smiling together"
              className="absolute inset-0 h-full w-full object-cover"
              src="https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=1400&q=80"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#6d1849d4] via-[#a1166f80] to-[#ffffff30]" />
            <div className="relative z-10 max-w-xl text-white">
              <p className="text-3xl font-semibold leading-tight md:text-4xl">Your Safety. Your Confidence. Always.</p>
              <p className="mt-3 text-sm text-[#ffe8f4] md:text-base">
                A safer way to stay connected, protected, and supported.
              </p>
            </div>
          </section>

          <section className="flex items-center justify-center bg-gradient-to-b from-white to-[#fff8fc] p-4 md:p-8">
            <div className="w-full max-w-md rounded-3xl border border-[var(--color-brand-border)] bg-white p-6 shadow-[0_20px_50px_rgba(205,22,119,0.12)] md:p-8">
              <div className="mb-6 text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--color-brand-pink-light)] text-2xl shadow-[0_8px_18px_rgba(205,22,119,0.2)]">
                  🛡️
                </div>
                <h1 className="text-3xl font-bold text-[var(--color-brand-text)]">Women Safety Platform</h1>
                <p className="mt-1 text-sm text-[var(--color-brand-muted)]">
                  {isRegisterPage
                    ? 'Create your account to stay connected, protected, and supported.'
                    : 'Secure access for Admin, Guardian and End User'}
                </p>
              </div>
              <Outlet />
            </div>
          </section>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-brand-black px-4 py-10 text-brand-text">
      <div className="mx-auto w-full max-w-md rounded-2xl border border-brand-border bg-brand-dark p-6 shadow-brand">
        <h1 className="mb-2 text-center text-2xl font-bold">Women Safety Platform</h1>
        <p className="mb-6 text-center text-sm text-brand-muted">Secure access for Admin, Guardian and End User</p>
        <Outlet />
      </div>
    </div>
  )
}
