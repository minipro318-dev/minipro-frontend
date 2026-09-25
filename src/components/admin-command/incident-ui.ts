import type { Incident } from '../../types/incident.types'

export const normalizeStatus = (status: string) => status.toUpperCase()

export const statusToneClasses = (status: string) => {
  const normalized = normalizeStatus(status)
  if (normalized === 'ACTIVE') return 'bg-[var(--color-brand-pink)] text-white'
  if (normalized === 'PENDING') return 'bg-[var(--color-brand-pink-soft)] text-[var(--color-brand-salmon)]'
  if (normalized === 'RESOLVED') return 'bg-[var(--color-brand-pink-light)] text-[var(--color-brand-pink)]'
  if (normalized === 'CANCELLED') return 'bg-[var(--color-brand-black-soft)] text-[var(--color-brand-pink)]'
  return 'bg-[var(--color-brand-black-soft)] text-[var(--color-brand-pink)]'
}

export const markerColorForStatus = (status: string) => {
  const normalized = normalizeStatus(status)
  if (normalized === 'ACTIVE') return 'var(--color-brand-pink)'
  if (normalized === 'PENDING') return 'var(--color-brand-salmon)'
  if (normalized === 'RESOLVED') return 'var(--color-brand-peach)'
  if (normalized === 'CANCELLED') return 'var(--color-brand-border-soft)'
  return 'var(--color-brand-pink)'
}

export const incidentDate = (incident: Incident) => new Date(incident.createdAt)

export const toLocalTime = (isoDate: string) => new Date(isoDate).toLocaleString()
