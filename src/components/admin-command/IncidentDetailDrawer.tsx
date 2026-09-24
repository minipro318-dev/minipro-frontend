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
    <div className="pointer-events-none absolute inset-0 z-30 flex items-end justify-end p-2 sm:p-3">
      <aside className="pointer-events-auto w-full max-w-md rounded-xl border border-[#2a2a2a] bg-[#111111]/95 p-4 backdrop-blur">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className={`inline-block rounded-full px-2 py-1 text-[10px] font-semibold ${statusToneClasses(incident.status)}`}>
              {incident.status}
            </p>
            <h3 className="mt-2 text-lg font-semibold text-[#F7E8E4]">{incident.title}</h3>
            <p className="text-xs text-[#A8A29E]">Incident #{incident.id}</p>
          </div>
          <button className="rounded-md bg-[#1b1b1b] px-2 py-1 text-xs text-[#F7E8E4]" onClick={onClose} type="button">
            Close
          </button>
        </div>

        <div className="mt-4 space-y-3 text-sm">
          <div>
            <p className="text-xs uppercase tracking-wide text-[#A8A29E]">Reported by</p>
            <p className="text-[#F7E8E4]">
              {incident.reportedBy.name} ({incident.reportedBy.role})
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-[#A8A29E]">Reported</p>
            <p className="text-[#F7E8E4]">{toLocalTime(incident.createdAt)}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-[#A8A29E]">Location</p>
            <p className="text-[#F7E8E4]">{latestLocation?.address ?? 'Address unavailable'}</p>
            {latestLocation ? (
              <>
                <p className="text-xs text-[#A8A29E]">
                  Latitude: {latestLocation.latitude} | Longitude: {latestLocation.longitude}
                </p>
                <p className="text-xs text-[#A8A29E]">Accuracy: {latestLocation.accuracy ?? 'N/A'}</p>
                <p className="text-xs text-[#A8A29E]">GPS update: {toLocalTime(latestLocation.locationTimestamp)}</p>
              </>
            ) : null}
          </div>
          {incident.description ? (
            <div>
              <p className="text-xs uppercase tracking-wide text-[#A8A29E]">Message</p>
              <p className="text-[#F7E8E4]">{incident.description}</p>
            </div>
          ) : null}
        </div>

        <IncidentActions incidentId={incident.id} onCancel={onCancel} onResolve={onResolve} status={incident.status} />
      </aside>
    </div>
  )
}

