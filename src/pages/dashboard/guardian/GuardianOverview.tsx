import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { IncidentActions } from '../../../components/admin-command/IncidentActions'
import { StatusBadge } from '../../../components/common/StatusBadge'
import { getGuardianSummary } from '../../../components/guardian/guardian-data'
import { InlineAlert } from '../../../components/ui'
import { useAuth } from '../../../hooks/useAuth'
import { useIncidents } from '../../../hooks/useIncidents'

export const GuardianOverview = () => {
  const { token } = useAuth()
  const { incidents, loading, error, message, setError, setMessage, resolveIncident } = useIncidents(token)

  const summary = useMemo(() => getGuardianSummary(incidents), [incidents])
  const activeIncidents = useMemo(() => incidents.filter((incident) => incident.status === 'ACTIVE'), [incidents])
  const recentIncidents = useMemo(
    () => [...incidents].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 8),
    [incidents],
  )

  const onResolveIncident = async (incidentId: number, resolutionNote?: string) => {
    setError('')
    setMessage('')
    await resolveIncident(incidentId, resolutionNote)
  }

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-[var(--color-brand-border)] bg-[var(--color-brand-dark)] p-5">
        <h2 className="text-2xl font-semibold text-[var(--color-brand-text)]">Guardian Overview</h2>
        <p className="mt-1 text-sm text-[var(--color-brand-muted)]">Monitor the safety status of your linked users.</p>
      </section>

      {error ? <InlineAlert message={error} /> : null}
      {message ? <p className="rounded-md border border-[var(--color-brand-border)] bg-[var(--color-brand-pink-light)] px-3 py-2 text-sm text-[var(--color-brand-pink)]">{message}</p> : null}
      {loading ? <section className="rounded-xl border border-[var(--color-brand-border)] bg-[var(--color-brand-dark)] p-4 text-sm text-[var(--color-brand-muted)]">Loading guardian data…</section> : null}

      {!loading ? (
        <>
          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <article className="rounded-xl border border-[var(--color-brand-border)] bg-[var(--color-brand-dark)] p-4">
              <p className="text-xs uppercase tracking-widest text-[var(--color-brand-muted)]">Active Incidents</p>
              <p className="mt-1 text-3xl font-semibold text-[var(--color-brand-pink)]">{summary.active}</p>
              <p className="text-xs text-[var(--color-brand-muted)]">Active incidents</p>
            </article>
            <article className="rounded-xl border border-[var(--color-brand-border)] bg-[var(--color-brand-dark)] p-4">
              <p className="text-xs uppercase tracking-widest text-[var(--color-brand-muted)]">Linked Users</p>
              <p className="mt-1 text-3xl font-semibold text-[var(--color-brand-text)]">{summary.linkedUsers}</p>
              <p className="text-xs text-[var(--color-brand-muted)]">Linked users</p>
            </article>
            <article className="rounded-xl border border-[var(--color-brand-border)] bg-[var(--color-brand-dark)] p-4">
              <p className="text-xs uppercase tracking-widest text-[var(--color-brand-muted)]">Incidents Today</p>
              <p className="mt-1 text-3xl font-semibold text-[var(--color-brand-pink)]">{summary.incidentsToday}</p>
              <p className="text-xs text-[var(--color-brand-muted)]">Today</p>
            </article>
            <article className="rounded-xl border border-[var(--color-brand-border)] bg-[var(--color-brand-dark)] p-4">
              <p className="text-xs uppercase tracking-widest text-[var(--color-brand-muted)]">Resolved Incidents</p>
              <p className="mt-1 text-3xl font-semibold text-[var(--color-brand-pink)]">{summary.resolved}</p>
              <p className="text-xs text-[var(--color-brand-muted)]">Resolved</p>
            </article>
          </section>

          <section
            className={`rounded-xl border p-5 ${
              activeIncidents.length
                ? 'border-[var(--color-brand-pink)]/40 bg-[var(--color-brand-pink-light)]'
                : 'border-[var(--color-brand-border)] bg-[var(--color-brand-black-soft)]'
            }`}
          >
            <h3 className="text-lg font-semibold text-[var(--color-brand-text)]">{activeIncidents.length ? 'ACTIVE EMERGENCY' : 'No Active Emergencies'}</h3>
            {!activeIncidents.length ? (
              <p className="mt-2 text-sm text-[var(--color-brand-muted)]">All linked users are currently safe based on available incident data.</p>
            ) : (
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                {activeIncidents.map((incident) => {
                  const latestLocation = incident.locationLogs[0]
                  return (
                    <article className="rounded-lg border border-[var(--color-brand-border)] bg-[var(--color-brand-dark)] p-4" key={incident.id}>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-semibold text-[var(--color-brand-text)]">{incident.title}</p>
                          <p className="text-xs text-[var(--color-brand-muted)]">Incident #{incident.id}</p>
                        </div>
                        <StatusBadge label="ACTIVE" tone="danger" />
                      </div>
                      <div className="mt-3 space-y-1 text-sm text-[var(--color-brand-muted)]">
                        <p>User: <span className="text-[var(--color-brand-text)]">{incident.reportedBy.name}</span></p>
                        <p>Time: <span className="text-[var(--color-brand-text)]">{new Date(incident.createdAt).toLocaleString()}</span></p>
                        <p>Location: <span className="text-[var(--color-brand-text)]">{latestLocation?.address ? 'Available' : 'Unavailable'}</span></p>
                        <p>Last location update: <span className="text-[var(--color-brand-text)]">{latestLocation ? new Date(latestLocation.locationTimestamp).toLocaleString() : 'N/A'}</span></p>
                      </div>
                      <Link className="mt-3 inline-block rounded-md bg-[var(--color-brand-pink)] px-3 py-1.5 text-sm font-semibold text-white hover:opacity-90" to={`/dashboard/guardian/incidents?incidentId=${incident.id}`}>
                        View Incident
                      </Link>
                      <IncidentActions
                        allowCancel={false}
                        incidentId={incident.id}
                        onResolve={onResolveIncident}
                        resolveButtonLabel="Mark Emergency Resolved"
                        status={incident.status}
                      />
                    </article>
                  )
                })}
              </div>
            )}
          </section>

          <section className="rounded-xl border border-[var(--color-brand-border)] bg-[var(--color-brand-dark)] p-5">
            <h3 className="text-lg font-semibold text-[var(--color-brand-text)]">Recent Incidents</h3>
            {recentIncidents.length ? (
              <>
                <div className="mt-3 hidden overflow-x-auto lg:block">
                  <table className="min-w-full text-left text-sm">
                    <thead className="text-xs uppercase tracking-wider text-[var(--color-brand-muted)]">
                      <tr>
                        <th className="pb-2">Incident</th>
                        <th className="pb-2">User</th>
                        <th className="pb-2">Date &amp; Time</th>
                        <th className="pb-2">Status</th>
                        <th className="pb-2">Location</th>
                        <th className="pb-2">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentIncidents.map((incident) => (
                        <tr className="border-t border-[var(--color-brand-border)]" key={incident.id}>
                          <td className="py-3">
                            <p className="font-medium text-[var(--color-brand-text)]">{incident.title}</p>
                            <p className="text-xs text-[var(--color-brand-muted)]">#{incident.id}</p>
                          </td>
                          <td className="py-3 text-[var(--color-brand-text)]">{incident.reportedBy.name}</td>
                          <td className="py-3 text-[var(--color-brand-muted)]">{new Date(incident.createdAt).toLocaleString()}</td>
                          <td className="py-3">
                            <StatusBadge
                              label={incident.status}
                              tone={incident.status === 'ACTIVE' ? 'danger' : incident.status === 'RESOLVED' ? 'safe' : 'neutral'}
                            />
                            {incident.status === 'RESOLVED' && incident.resolvedByRole ? (
                              <p className="mt-1 text-[11px] text-[var(--color-brand-muted)]">By {incident.resolvedByRole}</p>
                            ) : null}
                          </td>
                          <td className="py-3 text-[var(--color-brand-muted)]">{incident.locationLogs[0]?.address ?? 'Unavailable'}</td>
                          <td className="py-3">
                            <Link
                              className="inline-block rounded-md border border-[var(--color-brand-border)] bg-white px-2 py-1 text-xs font-semibold text-[var(--color-brand-pink)] hover:bg-[var(--color-brand-pink-light)]"
                              to={`/dashboard/guardian/incidents?incidentId=${incident.id}`}
                            >
                              View
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="mt-3 space-y-2 lg:hidden">
                  {recentIncidents.map((incident) => (
                    <article className="rounded-lg border border-[var(--color-brand-border)] bg-[var(--color-brand-black-soft)] p-3" key={incident.id}>
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <p className="font-medium text-[var(--color-brand-text)]">{incident.title}</p>
                          <p className="text-xs text-[var(--color-brand-muted)]">Incident #{incident.id}</p>
                        </div>
                        <StatusBadge
                          label={incident.status}
                          tone={incident.status === 'ACTIVE' ? 'danger' : incident.status === 'RESOLVED' ? 'safe' : 'neutral'}
                        />
                      </div>
                      <p className="mt-2 text-xs text-[var(--color-brand-muted)]">{incident.reportedBy.name} • {new Date(incident.createdAt).toLocaleString()}</p>
                      <Link
                        className="mt-2 inline-block rounded-md border border-[var(--color-brand-border)] bg-white px-2 py-1 text-xs font-semibold text-[var(--color-brand-pink)] hover:bg-[var(--color-brand-pink-light)]"
                        to={`/dashboard/guardian/incidents?incidentId=${incident.id}`}
                      >
                        View
                      </Link>
                    </article>
                  ))}
                </div>
              </>
            ) : (
              <p className="mt-3 text-sm text-[var(--color-brand-muted)]">No incidents have been reported by your linked users.</p>
            )}
          </section>
        </>
      ) : null}
    </div>
  )
}
