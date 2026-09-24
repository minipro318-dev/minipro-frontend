import type { ReactNode } from 'react'
import type { Incident } from '../../types/incident.types'
import { IncidentStatusBadge } from './IncidentStatusBadge'

type IncidentCardProps = {
  incident: Incident
  actionSlot?: ReactNode
}

export const IncidentCard = ({ incident, actionSlot }: IncidentCardProps) => {
  const latestLocation = incident.locationLogs[0]

  return (
    <article className="rounded-xl border border-brand-border bg-brand-dark p-4 shadow-brand-soft">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-lg font-semibold text-brand-pink">{incident.title}</p>
          <p className="text-xs text-brand-muted">Incident #{incident.id}</p>
        </div>
        <IncidentStatusBadge status={incident.status} />
      </div>

      <p className="mt-2 text-sm text-brand-muted">
        Reported by: {incident.reportedBy.name} ({incident.reportedBy.role}) on {new Date(incident.createdAt).toLocaleString()}
      </p>

      {incident.description ? <p className="mt-2 text-sm">{incident.description}</p> : null}

      {latestLocation ? (
        <div className="mt-3 rounded-md border border-brand-border-soft/50 bg-brand-black/60 p-3 text-sm">
          <p>Lat: {latestLocation.latitude.toFixed(6)}</p>
          <p>Lng: {latestLocation.longitude.toFixed(6)}</p>
          <p>Address: {latestLocation.address || 'Not provided'}</p>
          <p className="text-xs text-brand-muted">Updated: {new Date(latestLocation.createdAt).toLocaleString()} ({latestLocation.source})</p>
        </div>
      ) : null}

      {actionSlot ? <div className="mt-4 flex flex-wrap gap-2">{actionSlot}</div> : null}
    </article>
  )
}
