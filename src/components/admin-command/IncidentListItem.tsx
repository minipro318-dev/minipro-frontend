import type { Incident } from '../../types/incident.types'
import { statusToneClasses, toLocalTime } from './incident-ui'

type IncidentListItemProps = {
  incident: Incident
  selected: boolean
  onSelect: (incident: Incident) => void
}

export const IncidentListItem = ({ incident, selected, onSelect }: IncidentListItemProps) => (
  <button
    className={`w-full rounded-xl border px-3 py-3 text-left transition ${
      selected
        ? 'border-[var(--color-brand-pink)] bg-[var(--color-brand-pink-light)] shadow-[0_8px_20px_rgba(217,20,122,0.12)]'
        : 'border-[var(--color-brand-border)] bg-[var(--color-brand-dark)] hover:border-[var(--color-brand-border)] hover:bg-[var(--color-brand-black-soft)]'
    }`}
    onClick={() => onSelect(incident)}
    type="button"
  >
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="text-sm font-medium text-[var(--color-brand-text)]">{incident.title}</p>
        <p className="text-xs text-[var(--color-brand-muted)]">Incident #{incident.id}</p>
      </div>
      <span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${statusToneClasses(incident.status)}`}>
        {incident.status}
      </span>
    </div>

    <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-[var(--color-brand-muted)]">
      <p className="truncate">By: {incident.reportedBy?.name ?? 'Unknown'}</p>
      <p className="text-right">{toLocalTime(incident.createdAt)}</p>
      <p className="col-span-2 truncate">{incident.locationLogs[0]?.address ?? 'No address yet'}</p>
    </div>
  </button>
)
