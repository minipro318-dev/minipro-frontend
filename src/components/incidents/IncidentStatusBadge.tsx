import type { IncidentStatus } from '../../types/incident.types'

type IncidentStatusBadgeProps = {
  status: IncidentStatus
}

const badgeClassByStatus: Record<IncidentStatus, string> = {
  ACTIVE: 'border-[var(--color-brand-pink)] bg-[var(--color-brand-pink)] text-white',
  PENDING: 'border-[var(--color-brand-border-soft)] bg-[var(--color-brand-pink-soft)] text-[var(--color-brand-salmon)]',
  RESOLVED: 'border-[var(--color-brand-border)] bg-[var(--color-brand-pink-light)] text-[var(--color-brand-pink)]',
  CANCELLED: 'border-[var(--color-brand-border)] bg-[var(--color-brand-black-soft)] text-[var(--color-brand-pink)]',
}

export const IncidentStatusBadge = ({ status }: IncidentStatusBadgeProps) => (
  <span className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${badgeClassByStatus[status]}`}>{status}</span>
)
