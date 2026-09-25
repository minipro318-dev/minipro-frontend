import { useMemo, useState, useEffect } from 'react'
import { StatusBadge } from '../../../components/common/StatusBadge'
import { IncidentMap } from '../../../components/incidents'
import { InlineAlert, PrimaryButton } from '../../../components/ui'
import { useAuth } from '../../../hooks/useAuth'
import { incidentApi } from '../../../services/incident.api'
import type { Incident } from '../../../types/incident.types'

export const UserIncidents = () => {
  const { token } = useAuth()
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const loadIncidents = async () => {
    if (!token) return
    const data = await incidentApi.list(token)
    setIncidents(data.incidents)
  }

  useEffect(() => {
    const run = async () => {
      try {
        await loadIncidents()
      } catch (apiError) {
        const apiMessage =
          typeof apiError === 'object' && apiError && 'message' in apiError && typeof apiError.message === 'string'
            ? apiError.message
            : 'Could not load incidents.'
        setError(apiMessage)
      }
    }
    void run()
  }, [token])

  const summary = useMemo(() => {
    const active = incidents.filter((incident) => incident.status === 'ACTIVE').length
    const resolved = incidents.filter((incident) => incident.status === 'RESOLVED').length
    return { total: incidents.length, active, resolved }
  }, [incidents])

  const orderedIncidents = useMemo(
    () => [...incidents].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [incidents],
  )

  const onCancelIncident = async (incidentId: number) => {
    if (!token) return
    setError('')
    setMessage('')
    try {
      await incidentApi.cancel(token, incidentId)
      setMessage(`Incident #${incidentId} cancelled successfully.`)
      await loadIncidents()
    } catch (apiError) {
      const apiMessage =
        typeof apiError === 'object' && apiError && 'message' in apiError && typeof apiError.message === 'string'
          ? apiError.message
          : 'Failed to cancel incident.'
      setError(apiMessage)
    }
  }

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-[var(--color-brand-border)] bg-[var(--color-brand-dark)] p-5">
        <h2 className="text-2xl font-semibold text-[var(--color-brand-text)]">My Incidents</h2>
        <p className="mt-1 text-sm text-[var(--color-brand-muted)]">View your emergency and safety incident history.</p>
      </section>
      {error ? <InlineAlert message={error} /> : null}
      {message ? <p className="rounded-md border border-[var(--color-brand-border)] bg-[var(--color-brand-pink-light)] px-3 py-2 text-sm text-[var(--color-brand-pink)]">{message}</p> : null}

      <section className="grid gap-3 sm:grid-cols-3">
        <article className="rounded-xl border border-[var(--color-brand-border)] bg-[var(--color-brand-dark)] p-4">
          <p className="text-sm text-[var(--color-brand-muted)]">Total Incidents</p>
          <p className="text-2xl font-semibold text-[var(--color-brand-text)]">{summary.total}</p>
        </article>
        <article className="rounded-xl border border-[var(--color-brand-border)] bg-[var(--color-brand-dark)] p-4">
          <p className="text-sm text-[var(--color-brand-muted)]">Active</p>
          <p className="text-2xl font-semibold text-[var(--color-brand-pink)]">{summary.active}</p>
        </article>
        <article className="rounded-xl border border-[var(--color-brand-border)] bg-[var(--color-brand-dark)] p-4">
          <p className="text-sm text-[var(--color-brand-muted)]">Resolved</p>
          <p className="text-2xl font-semibold text-[var(--color-brand-pink)]">{summary.resolved}</p>
        </article>
      </section>

      <section className="space-y-3">
        {orderedIncidents.length ? (
          orderedIncidents.map((incident) => {
            const latestLocation = incident.locationLogs[0]
            const badgeTone =
              incident.status === 'ACTIVE' ? 'danger' : incident.status === 'RESOLVED' ? 'safe' : 'neutral'

            return (
              <article className="rounded-xl border border-[var(--color-brand-border)] bg-[var(--color-brand-dark)] p-4" key={incident.id}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-lg font-semibold text-[var(--color-brand-text)]">{incident.title}</p>
                    <p className="text-xs text-[var(--color-brand-muted)]">Incident #{incident.id}</p>
                  </div>
                  <StatusBadge label={incident.status} tone={badgeTone} />
                </div>

                <div className="mt-3 grid gap-2 text-sm text-[var(--color-brand-muted)] sm:grid-cols-2">
                  <p><span className="text-[var(--color-brand-text)]">Reported:</span> {new Date(incident.createdAt).toLocaleString()}</p>
                  <p><span className="text-[var(--color-brand-text)]">Description:</span> {incident.description || 'No additional details'}</p>
                  <p><span className="text-[var(--color-brand-text)]">Location:</span> {latestLocation ? `${latestLocation.latitude}, ${latestLocation.longitude}` : 'Not available'}</p>
                  <p><span className="text-[var(--color-brand-text)]">GPS Accuracy:</span> {latestLocation?.accuracy ?? 'N/A'}</p>
                  <p className="sm:col-span-2"><span className="text-[var(--color-brand-text)]">Address:</span> {latestLocation?.address ?? 'Address unavailable'}</p>
                </div>

                {incident.status === 'ACTIVE' ? (
                  <div className="mt-3">
                    <PrimaryButton className="w-auto px-3 py-1 text-sm" onClick={() => void onCancelIncident(incident.id)} type="button">
                      Cancel Incident
                    </PrimaryButton>
                  </div>
                ) : null}

                {incident.locationLogs.length ? (
                  <details className="mt-4 rounded-lg border border-[var(--color-brand-border)] bg-[var(--color-brand-black-soft)] p-3">
                    <summary className="cursor-pointer text-sm font-medium text-[var(--color-brand-text)]">View incident details & map</summary>
                    <div className="mt-3 space-y-3">
                      <div className="grid gap-2 text-xs text-[var(--color-brand-muted)] sm:grid-cols-2">
                        <p><span className="text-[var(--color-brand-text)]">Reported by:</span> {incident.reportedBy.name}</p>
                        <p><span className="text-[var(--color-brand-text)]">GPS timestamp:</span> {new Date(latestLocation?.locationTimestamp ?? incident.createdAt).toLocaleString()}</p>
                      </div>
                      <IncidentMap incident={incident} />
                    </div>
                  </details>
                ) : null}
              </article>
            )
          })
        ) : (
          <p className="rounded-xl border border-[var(--color-brand-border)] bg-[var(--color-brand-dark)] p-4 text-sm text-[var(--color-brand-muted)]">No incidents found yet.</p>
        )}
      </section>
    </div>
  )
}
