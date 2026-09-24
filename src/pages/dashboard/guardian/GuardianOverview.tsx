import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { StatusBadge } from '../../../components/common/StatusBadge'
import { getGuardianSummary } from '../../../components/guardian/guardian-data'
import { InlineAlert } from '../../../components/ui'
import { useAuth } from '../../../hooks/useAuth'
import { useIncidents } from '../../../hooks/useIncidents'

export const GuardianOverview = () => {
  const { token } = useAuth()
  const { incidents, loading, error } = useIncidents(token)

  const summary = useMemo(() => getGuardianSummary(incidents), [incidents])
  const activeIncidents = useMemo(() => incidents.filter((incident) => incident.status === 'ACTIVE'), [incidents])
  const recentIncidents = useMemo(
    () => [...incidents].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 8),
    [incidents],
  )

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-[#2a2a2a] bg-[#111111] p-5">
        <h2 className="text-2xl font-semibold text-[#F7E8E4]">Guardian Overview</h2>
        <p className="mt-1 text-sm text-[#A8A29E]">Monitor the safety status of your linked users.</p>
      </section>

      {error ? <InlineAlert message={error} /> : null}
      {loading ? <section className="rounded-xl border border-[#2a2a2a] bg-[#111111] p-4 text-sm text-[#A8A29E]">Loading guardian data…</section> : null}

      {!loading ? (
        <>
          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <article className="rounded-xl border border-red-500/40 bg-[#111111] p-4">
              <p className="text-xs uppercase tracking-widest text-[#A8A29E]">Active Incidents</p>
              <p className="mt-1 text-3xl font-semibold text-red-300">{summary.active}</p>
              <p className="text-xs text-[#A8A29E]">Active incidents</p>
            </article>
            <article className="rounded-xl border border-[#2a2a2a] bg-[#111111] p-4">
              <p className="text-xs uppercase tracking-widest text-[#A8A29E]">Linked Users</p>
              <p className="mt-1 text-3xl font-semibold text-[#F7E8E4]">{summary.linkedUsers}</p>
              <p className="text-xs text-[#A8A29E]">Linked users</p>
            </article>
            <article className="rounded-xl border border-amber-500/40 bg-[#111111] p-4">
              <p className="text-xs uppercase tracking-widest text-[#A8A29E]">Incidents Today</p>
              <p className="mt-1 text-3xl font-semibold text-amber-300">{summary.incidentsToday}</p>
              <p className="text-xs text-[#A8A29E]">Today</p>
            </article>
            <article className="rounded-xl border border-emerald-500/40 bg-[#111111] p-4">
              <p className="text-xs uppercase tracking-widest text-[#A8A29E]">Resolved Incidents</p>
              <p className="mt-1 text-3xl font-semibold text-emerald-300">{summary.resolved}</p>
              <p className="text-xs text-[#A8A29E]">Resolved</p>
            </article>
          </section>

          <section className={`rounded-xl border p-5 ${activeIncidents.length ? 'border-red-500/40 bg-red-950/10' : 'border-emerald-500/30 bg-emerald-950/10'}`}>
            <h3 className="text-lg font-semibold text-[#F7E8E4]">{activeIncidents.length ? 'ACTIVE EMERGENCY' : 'No Active Emergencies'}</h3>
            {!activeIncidents.length ? (
              <p className="mt-2 text-sm text-[#A8A29E]">All linked users are currently safe based on available incident data.</p>
            ) : (
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                {activeIncidents.map((incident) => {
                  const latestLocation = incident.locationLogs[0]
                  return (
                    <article className="rounded-lg border border-red-500/30 bg-[#111111] p-4" key={incident.id}>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-semibold text-[#F7E8E4]">{incident.title}</p>
                          <p className="text-xs text-[#A8A29E]">Incident #{incident.id}</p>
                        </div>
                        <StatusBadge label="ACTIVE" tone="danger" />
                      </div>
                      <div className="mt-3 space-y-1 text-sm text-[#A8A29E]">
                        <p>User: <span className="text-[#F7E8E4]">{incident.reportedBy.name}</span></p>
                        <p>Time: <span className="text-[#F7E8E4]">{new Date(incident.createdAt).toLocaleString()}</span></p>
                        <p>Location: <span className="text-[#F7E8E4]">{latestLocation?.address ? 'Available' : 'Unavailable'}</span></p>
                        <p>Last location update: <span className="text-[#F7E8E4]">{latestLocation ? new Date(latestLocation.locationTimestamp).toLocaleString() : 'N/A'}</span></p>
                      </div>
                      <Link className="mt-3 inline-block rounded-md bg-[#F2A093] px-3 py-1.5 text-sm font-semibold text-black hover:opacity-90" to={`/dashboard/guardian/incidents?incidentId=${incident.id}`}>
                        View Incident
                      </Link>
                    </article>
                  )
                })}
              </div>
            )}
          </section>

          <section className="rounded-xl border border-[#2a2a2a] bg-[#111111] p-5">
            <h3 className="text-lg font-semibold text-[#F7E8E4]">Recent Incidents</h3>
            {recentIncidents.length ? (
              <>
                <div className="mt-3 hidden overflow-x-auto lg:block">
                  <table className="min-w-full text-left text-sm">
                    <thead className="text-xs uppercase tracking-wider text-[#A8A29E]">
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
                        <tr className="border-t border-[#262626]" key={incident.id}>
                          <td className="py-3">
                            <p className="font-medium text-[#F7E8E4]">{incident.title}</p>
                            <p className="text-xs text-[#A8A29E]">#{incident.id}</p>
                          </td>
                          <td className="py-3 text-[#F7E8E4]">{incident.reportedBy.name}</td>
                          <td className="py-3 text-[#A8A29E]">{new Date(incident.createdAt).toLocaleString()}</td>
                          <td className="py-3">
                            <StatusBadge
                              label={incident.status}
                              tone={incident.status === 'ACTIVE' ? 'danger' : incident.status === 'RESOLVED' ? 'safe' : 'neutral'}
                            />
                          </td>
                          <td className="py-3 text-[#A8A29E]">{incident.locationLogs[0]?.address ?? 'Unavailable'}</td>
                          <td className="py-3">
                            <Link className="text-[#F2A093] hover:underline" to={`/dashboard/guardian/incidents?incidentId=${incident.id}`}>
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
                    <article className="rounded-lg border border-[#2a2a2a] bg-[#161616] p-3" key={incident.id}>
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <p className="font-medium text-[#F7E8E4]">{incident.title}</p>
                          <p className="text-xs text-[#A8A29E]">Incident #{incident.id}</p>
                        </div>
                        <StatusBadge
                          label={incident.status}
                          tone={incident.status === 'ACTIVE' ? 'danger' : incident.status === 'RESOLVED' ? 'safe' : 'neutral'}
                        />
                      </div>
                      <p className="mt-2 text-xs text-[#A8A29E]">{incident.reportedBy.name} • {new Date(incident.createdAt).toLocaleString()}</p>
                      <Link className="mt-2 inline-block text-sm text-[#F2A093] hover:underline" to={`/dashboard/guardian/incidents?incidentId=${incident.id}`}>
                        View
                      </Link>
                    </article>
                  ))}
                </div>
              </>
            ) : (
              <p className="mt-3 text-sm text-[#A8A29E]">No incidents have been reported by your linked users.</p>
            )}
          </section>
        </>
      ) : null}
    </div>
  )
}

