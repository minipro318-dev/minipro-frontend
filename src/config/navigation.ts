import type { UserRole } from '../types/auth.types'

export type NavigationItem = {
  label: string
  path: string
  roles: UserRole[]
  section: string
}

export const DASHBOARD_NAVIGATION: NavigationItem[] = [
  { section: 'INCIDENT MANAGEMENT', label: 'Incidents', path: '/dashboard/admin/incidents', roles: ['ADMIN'] },
  { section: 'INCIDENT MANAGEMENT', label: 'Users', path: '/dashboard/admin/users', roles: ['ADMIN'] },
  { section: 'INCIDENT MANAGEMENT', label: 'Responders', path: '/dashboard/admin/responders', roles: ['ADMIN'] },

  { section: 'MAIN NAVIGATION', label: 'Incidents', path: '/dashboard/guardian/incidents', roles: ['GUARDIAN'] },
  { section: 'MAIN NAVIGATION', label: 'Linked Users', path: '/dashboard/guardian/linked-users', roles: ['GUARDIAN'] },
  { section: 'BOTTOM', label: 'Help & Support', path: '/dashboard/guardian/support', roles: ['GUARDIAN'] },

  { section: 'MAIN NAVIGATION', label: 'Overview', path: '/dashboard/user/overview', roles: ['END_USER'] },
  { section: 'MAIN NAVIGATION', label: 'SOS Center', path: '/dashboard/user/sos', roles: ['END_USER'] },
  { section: 'MAIN NAVIGATION', label: 'Nearby Help', path: '/dashboard/user/nearby-help', roles: ['END_USER'] },
  { section: 'MAIN NAVIGATION', label: 'Guardians', path: '/dashboard/user/guardians', roles: ['END_USER'] },
  { section: 'MAIN NAVIGATION', label: 'My Incidents', path: '/dashboard/user/incidents', roles: ['END_USER'] },
  { section: 'MAIN NAVIGATION', label: 'Safety Resources', path: '/dashboard/user/resources', roles: ['END_USER'] },
  { section: 'MAIN NAVIGATION', label: 'Settings', path: '/dashboard/user/settings', roles: ['END_USER'] },
  { section: 'BOTTOM NAVIGATION', label: 'Help & Support', path: '/dashboard/user/support', roles: ['END_USER'] },
]
