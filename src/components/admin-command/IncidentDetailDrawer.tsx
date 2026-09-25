import type { Incident } from '../../types/incident.types'
import { statusToneClasses, toLocalTime } from './incident-ui'
import { IncidentActions } from './IncidentActions'

type IncidentDetailDrawerProps = {
  incident: Incident | null
  open: boolean
  onClose: () => void
  onResolve: (incidentId: number) => Promise<void>
  onCancel: (incidentId: number) => Promise<void>
}

export const IncidentDetailDrawer = ({ incident, open, onClose, onResolve, onCancel }: IncidentDetailDrawerProps) => {
  if (!incident || !open) return null
  const latestLocation = incident.locationLogs[0]

  return (
    <aside className="w-full rounded-xl border border-[var(--color-brand-border)] bg-[var(--color-brand-dark)] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className={`inline-block rounded-full px-2 py-1 text-[10px] font-semibold ${statusToneClasses(incident.status)}`}>
            {incident.status}
          </p>
          <h3 className="mt-2 text-lg font-semibold text-[var(--color-brand-text)]">{incident.title}</h3>
          <p className="text-xs text-[var(--color-brand-muted)]">Incident #{incident.id}</p>
        </div>
        <button className="rounded-md bg-[var(--color-brand-black-soft)] px-2 py-1 text-xs text-[var(--color-brand-text)]" onClick={onClose} type="button">
          Close
        </button>
      </div>

      <div className="mt-4 space-y-3 text-sm">
        <div>
          <p className="text-xs uppercase tracking-wide text-[var(--color-brand-muted)]">Reported by</p>
          <p className="text-[var(--color-brand-text)]">
            {incident.reportedBy.name} ({incident.reportedBy.role})
          </p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-[var(--color-brand-muted)]">Reported</p>
          <p className="text-[var(--color-brand-text)]">{toLocalTime(incident.createdAt)}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-[var(--color-brand-muted)]">Location</p>
          <p className="text-[var(--color-brand-text)]">{latestLocation?.address ?? 'Address unavailable'}</p>
          {latestLocation ? (
            <>
              <p className="text-xs text-[var(--color-brand-muted)]">
                Latitude: {latestLocation.latitude} | Longitude: {latestLocation.longitude}
              </p>
              <p className="text-xs text-[var(--color-brand-muted)]">Accuracy: {latestLocation.accuracy ?? 'N/A'}</p>
              <p className="text-xs text-[var(--color-brand-muted)]">GPS update: {toLocalTime(latestLocation.locationTimestamp)}</p>
            </>
          ) : null}
        </div>
        {incident.description ? (
          <div>
            <p className="text-xs uppercase tracking-wide text-[var(--color-brand-muted)]">Message</p>
            <p className="text-[var(--color-brand-text)]">{incident.description}</p>
          </div>
        ) : null}
      </div>
      <IncidentActions incidentId={incident.id} onCancel={onCancel} onResolve={onResolve} status={incident.status} />
    </aside>
  )
}
