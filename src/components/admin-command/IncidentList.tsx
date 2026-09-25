import type { Incident } from '../../types/incident.types'
import { IncidentListItem } from './IncidentListItem'

type IncidentListProps = {
  incidents: Incident[]
  selectedIncidentId: number | null
  onSelect: (incident: Incident) => void
}

export const IncidentList = ({ incidents, selectedIncidentId, onSelect }: IncidentListProps) => {
  if (!incidents.length) {
    return (
      <div className="rounded-xl border border-[var(--color-brand-border)] bg-[var(--color-brand-dark)] p-8 text-center">
        <p className="text-lg font-medium text-[var(--color-brand-text)]">No incidents found</p>
        <p className="mt-1 text-sm text-[var(--color-brand-muted)]">Try changing your filters or search query.</p>
      </div>
    )
  }

  return (
    <section className="max-h-[62vh] space-y-2 overflow-y-auto pr-1">
      {incidents.map((incident) => (
        <IncidentListItem
          incident={incident}
          key={incident.id}
          onSelect={onSelect}
          selected={selectedIncidentId === incident.id}
        />
      ))}
    </section>
  )
}

