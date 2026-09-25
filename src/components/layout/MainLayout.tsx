import { useMemo, useState } from 'react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { DASHBOARD_NAVIGATION, type NavigationItem } from '../../config/navigation'
import { useAuth } from '../../hooks/useAuth'

const buildSections = (items: NavigationItem[]) =>
  items.reduce<Record<string, NavigationItem[]>>((groups, item) => {
    if (!groups[item.section]) groups[item.section] = []
    groups[item.section].push(item)
    return groups
  }, {})

export const MainLayout = () => {
  const { user, logout, homePath } = useAuth()
  const navigate = useNavigate()
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  const onLogout = async () => {
    await logout()
    navigate('/login', { replace: true })
  }

  const navItems = useMemo(
    () => DASHBOARD_NAVIGATION.filter((item) => user?.role && item.roles.includes(user.role)),
    [user?.role],
  )
  const normalizedNavItems = useMemo(() => {
    if (user?.role === 'END_USER' || user?.role === 'GUARDIAN') {
      return navItems.filter((item) => item.path !== homePath)
    }
    return navItems
  }, [navItems, user?.role, homePath])
  const grouped = useMemo(() => buildSections(normalizedNavItems), [normalizedNavItems])
  const isEndUser = user?.role === 'END_USER'
  const isGuardian = user?.role === 'GUARDIAN'

  const sidebarSections = Object.entries(grouped)
  const topSections = isEndUser ? sidebarSections.filter(([name]) => name !== 'BOTTOM NAVIGATION') : sidebarSections
  const bottomSections = isEndUser ? sidebarSections.filter(([name]) => name === 'BOTTOM NAVIGATION') : []

  const sidebar = (
    <aside className="flex h-full flex-col bg-white px-4 py-4 text-brand-text lg:sticky lg:top-0 lg:h-screen">
      <div className="mb-4 flex items-center justify-between lg:hidden">
        <p className="text-sm font-semibold text-brand-pink">Navigation</p>
        <button
          className="rounded border border-brand-border px-2 py-1 text-xs"
          onClick={() => setIsSidebarOpen(false)}
          type="button"
        >
          Close
        </button>
      </div>

      {!isGuardian ? (
        <div className="mb-4 rounded-lg border border-brand-border bg-brand-black-soft px-3 py-3">
          <p className="text-xs font-semibold text-brand-text">Women Safety Platform</p>
        </div>
      ) : null}

      <div className="mb-4">
        <Link
          className="inline-block rounded-md bg-brand-pink px-3 py-1 text-xs font-semibold text-white"
          to={homePath}
        >
          Dashboard Overview
        </Link>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {topSections.map(([sectionName, items]) => (
          <section className="mb-5" key={sectionName}>
            {!((isEndUser || isGuardian) && sectionName === 'MAIN NAVIGATION') ? (
              <p className="mb-2 px-1 text-[11px] font-semibold tracking-widest text-brand-muted">{sectionName}</p>
            ) : null}
            <nav className="space-y-1.5">
              {items.map((item) => (
                <NavLink
                  className={({ isActive }) =>
                    `block rounded-md px-3 py-2 text-sm transition ${
                      isActive
                        ? 'bg-brand-pink text-white font-semibold'
                        : 'text-brand-text hover:bg-brand-black-soft'
                    }`
                  }
                  key={item.path}
                  onClick={() => setIsSidebarOpen(false)}
                  to={item.path}
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>
          </section>
        ))}
      </div>

      {bottomSections.length ? (
        <div className="mb-3 border-t border-brand-border pt-3">
          {bottomSections.map(([sectionName, items]) => (
            <section className="mb-3" key={sectionName}>
              <nav className="space-y-1.5">
                {items.map((item) => (
                  <NavLink
                    className={({ isActive }) =>
                      `block rounded-md px-3 py-2 text-sm transition ${
                        isActive
                          ? 'bg-brand-pink text-white font-semibold'
                          : 'text-brand-text hover:bg-brand-black-soft'
                      }`
                    }
                    key={item.path}
                    onClick={() => setIsSidebarOpen(false)}
                    to={item.path}
                  >
                    {item.label}
                  </NavLink>
                ))}
              </nav>
            </section>
          ))}
        </div>
      ) : null}

      <div className="mt-3 border-t border-brand-border pt-3">
        <button
          className="w-full rounded-md bg-brand-pink px-3 py-2 text-sm font-semibold text-white transition hover:opacity-90"
          onClick={onLogout}
          type="button"
        >
          Logout
        </button>
      </div>
    </aside>
  )

  return (
    <div className="min-h-screen bg-brand-black text-brand-text">
      <button
        aria-label="Open navigation menu"
        className="fixed left-3 top-3 z-40 rounded border border-brand-border bg-white px-2 py-1 text-xs lg:hidden"
        onClick={() => setIsSidebarOpen(true)}
        type="button"
      >
        Menu
      </button>

      <div className="mx-auto grid w-full max-w-[1500px] grid-cols-1 lg:grid-cols-[280px_minmax(0,1fr)]">
        <div className="hidden border-r border-brand-border lg:block">{sidebar}</div>
        <main className="min-w-0 px-4 py-10 lg:py-6">
          <Outlet />
        </main>
      </div>

      {isSidebarOpen ? (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <button
            aria-label="Close navigation overlay"
            className="h-full w-1/4 bg-black/50"
            onClick={() => setIsSidebarOpen(false)}
            type="button"
          />
          <div className="h-full w-3/4 border-l border-brand-border">{sidebar}</div>
        </div>
      ) : null}
    </div>
  )
}
