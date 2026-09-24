import type { IncidentStatus } from '../../types/incident.types'

type IncidentStatusBadgeProps = {
  status: IncidentStatus
}

const badgeClassByStatus: Record<IncidentStatus, string> = {
  ACTIVE: 'border-red-500/70 bg-red-950/50 text-red-200',
  RESOLVED: 'border-emerald-500/70 bg-emerald-950/50 text-emerald-200',
  CANCELLED: 'border-zinc-500/70 bg-zinc-900/70 text-zinc-300',
}

export const IncidentStatusBadge = ({ status }: IncidentStatusBadgeProps) => (
  <span className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${badgeClassByStatus[status]}`}>{status}</span>
)
