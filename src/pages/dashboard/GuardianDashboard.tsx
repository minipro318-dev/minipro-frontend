import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { IncidentMap } from '../../components/incidents'
import { getGuardianSummary } from '../../components/guardian/guardian-data'
import { StatusBadge } from '../../components/common/StatusBadge'
import { InlineAlert } from '../../components/ui'
import { useAuth } from '../../hooks/useAuth'
import { useIncidents } from '../../hooks/useIncidents'
import type { Incident } from '../../types/incident.types'

const timelineEvents = (incident: Incident) => {
  const events: Array<{ label: string; at: string }> = [{ label: 'SOS Triggered', at: incident.createdAt }]
  const latestLocation = incident.locationLogs[0]
  if (latestLocation) {
    events.push({ label: 'Location Updated', at: latestLocation.locationTimestamp })
  }
  if (incident.resolvedAt) {
    events.push({ label: 'Incident Resolved', at: incident.resolvedAt })
  }
  return events.sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime())
}

export const GuardianDashboard = () => {
  const { token } = useAuth()
  const { incidents, loading, error } = useIncidents(token)
  const [filters, setFilters] = useState({ search: '', status: 'ALL', date: '' })
  const [searchParams, setSearchParams] = useSearchParams()
  const [selectedIncidentId, setSelectedIncidentId] = useState<number | null>(null)

  const summary = useMemo(() => getGuardianSummary(incidents), [incidents])

  const filteredIncidents = useMemo(() => {
    const query = filters.search.trim().toLowerCase()
    return [...incidents]
      .filter((incident) => {
        if (filters.status !== 'ALL' && incident.status !== filters.status) return false
        if (filters.date && new Date(incident.createdAt).toISOString().slice(0, 10) !== filters.date) return false
        if (!query) return true
        return (
          incident.title.toLowerCase().includes(query) ||
          incident.reportedBy.name.toLowerCase().includes(query) ||
          `incident #${incident.id}`.includes(query) ||
          (incident.locationLogs[0]?.address?.toLowerCase() ?? '').includes(query)
        )
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  }, [incidents, filters])

  useEffect(() => {
    const fromQuery = searchParams.get('incidentId')
    if (!fromQuery) return
    const parsed = Number(fromQuery)
    if (Number.isFinite(parsed)) {
      setSelectedIncidentId(parsed)
    }
  }, [searchParams])

  useEffect(() => {
    if (!filteredIncidents.length) {
      setSelectedIncidentId(null)
      return
    }
    if (!selectedIncidentId || !filteredIncidents.some((incident) => incident.id === selectedIncidentId)) {
      setSelectedIncidentId(filteredIncidents[0].id)
    }
  }, [filteredIncidents, selectedIncidentId])

  const selectedIncident = useMemo(
    () => filteredIncidents.find((incident) => incident.id === selectedIncidentId) ?? null,
    [filteredIncidents, selectedIncidentId],
  )

  const onSelectIncident = (incidentId: number) => {
    setSelectedIncidentId(incidentId)
    setSearchParams((previous) => {
      const next = new URLSearchParams(previous)
      next.set('incidentId', String(incidentId))
      return next
    })
  }

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-[#2a2a2a] bg-[#111111] p-5">
        <h2 className="text-2xl font-semibold text-[#F7E8E4]">Incidents</h2>
        <p className="mt-1 text-sm text-[#A8A29E]">View safety incidents raised by your linked users.</p>
      </section>

      {error ? <InlineAlert message={error} /> : null}
      {loading ? <section className="rounded-xl border border-[#2a2a2a] bg-[#111111] p-4 text-sm text-[#A8A29E]">Loading incidents…</section> : null}

      {!loading ? (
        <>
          <section className="grid gap-3 sm:grid-cols-3">
            <article className="rounded-xl border border-red-500/40 bg-[#111111] p-4">
              <p className="text-sm text-[#A8A29E]">Active</p>
              <p className="text-2xl font-semibold text-red-300">{summary.active}</p>
            </article>
            <article className="rounded-xl border border-emerald-500/40 bg-[#111111] p-4">
              <p className="text-sm text-[#A8A29E]">Resolved</p>
              <p className="text-2xl font-semibold text-emerald-300">{summary.resolved}</p>
            </article>
            <article className="rounded-xl border border-[#2a2a2a] bg-[#111111] p-4">
              <p className="text-sm text-[#A8A29E]">Total</p>
              <p className="text-2xl font-semibold text-[#F7E8E4]">{summary.total}</p>
            </article>
          </section>

          <section className="rounded-xl border border-[#2a2a2a] bg-[#111111] p-4">
            <div className="grid grid-cols-1 gap-2 md:grid-cols-[minmax(0,1fr)_180px_180px] md:items-center">
              <input
                className="w-full rounded-md border border-[#2a2a2a] bg-[#161616] px-3 py-1.5 text-sm text-[#F7E8E4] outline-none focus:border-[#F2A093]"
                onChange={(event) => setFilters((previous) => ({ ...previous, search: event.target.value }))}
                placeholder="Search user, incident, location..."
                value={filters.search}
              />
              <select
                className="w-full rounded-md border border-[#2a2a2a] bg-[#161616] px-3 py-1.5 text-sm text-[#F7E8E4] outline-none focus:border-[#F2A093]"
                onChange={(event) => setFilters((previous) => ({ ...previous, status: event.target.value }))}
                value={filters.status}
              >
                <option value="ALL">All status</option>
                <option value="ACTIVE">ACTIVE</option>
                <option value="RESOLVED">RESOLVED</option>
                <option value="CANCELLED">CANCELLED</option>
                <option value="PENDING">PENDING</option>
              </select>
              <input
                className="w-full rounded-md border border-[#2a2a2a] bg-[#161616] px-3 py-1.5 text-sm text-[#F7E8E4] outline-none focus:border-[#F2A093]"
                onChange={(event) => setFilters((previous) => ({ ...previous, date: event.target.value }))}
                type="date"
                value={filters.date}
              />
            </div>
          </section>

          <section className="rounded-xl border border-[#2a2a2a] bg-[#111111] p-4">
            {filteredIncidents.length ? (
              <>
                <div className="hidden overflow-x-auto lg:block">
                  <table className="min-w-full text-left text-sm">
                    <thead className="text-xs uppercase tracking-wider text-[#A8A29E]">
                      <tr>
                        <th className="pb-2">Incident #</th>
                        <th className="pb-2">Title</th>
                        <th className="pb-2">Linked User</th>
                        <th className="pb-2">Date / Time</th>
                        <th className="pb-2">Status</th>
                        <th className="pb-2">Location</th>
                        <th className="pb-2">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredIncidents.map((incident) => (
                        <tr className="border-t border-[#262626]" key={incident.id}>
                          <td className="py-3 text-[#F7E8E4]">#{incident.id}</td>
                          <td className="py-3 text-[#F7E8E4]">{incident.title}</td>
                          <td className="py-3 text-[#A8A29E]">{incident.reportedBy.name}</td>
                          <td className="py-3 text-[#A8A29E]">{new Date(incident.createdAt).toLocaleString()}</td>
                          <td className="py-3">
                            <StatusBadge
                              label={incident.status}
                              tone={incident.status === 'ACTIVE' ? 'danger' : incident.status === 'RESOLVED' ? 'safe' : 'neutral'}
                            />
                          </td>
                          <td className="py-3 text-[#A8A29E]">{incident.locationLogs[0]?.address ?? 'Unavailable'}</td>
                          <td className="py-3">
                            <button className="text-[#F2A093] hover:underline" onClick={() => onSelectIncident(incident.id)} type="button">
                              View
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="space-y-2 lg:hidden">
                  {filteredIncidents.map((incident) => (
                    <article className="rounded-lg border border-[#2a2a2a] bg-[#161616] p-3" key={incident.id}>
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-medium text-[#F7E8E4]">{incident.title} #{incident.id}</p>
                        <StatusBadge
                          label={incident.status}
                          tone={incident.status === 'ACTIVE' ? 'danger' : incident.status === 'RESOLVED' ? 'safe' : 'neutral'}
                        />
                      </div>
                      <p className="mt-2 text-xs text-[#A8A29E]">{incident.reportedBy.name} • {new Date(incident.createdAt).toLocaleString()}</p>
                      <button className="mt-2 text-sm text-[#F2A093] hover:underline" onClick={() => onSelectIncident(incident.id)} type="button">
                        View
                      </button>
                    </article>
                  ))}
                </div>
              </>
            ) : (
              <p className="text-sm text-[#A8A29E]">No incidents have been reported by your linked users.</p>
            )}
          </section>

          {selectedIncident ? (
            <section className="rounded-xl border border-[#2a2a2a] bg-[#111111] p-5">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-xl font-semibold text-[#F7E8E4]">{selectedIncident.title}</p>
                  <p className="text-xs text-[#A8A29E]">Incident #{selectedIncident.id}</p>
                </div>
                <StatusBadge
                  label={selectedIncident.status}
                  tone={selectedIncident.status === 'ACTIVE' ? 'danger' : selectedIncident.status === 'RESOLVED' ? 'safe' : 'neutral'}
                />
              </div>

              <div className="mt-4 grid gap-4 xl:grid-cols-2">
                <article className="rounded-lg border border-[#2a2a2a] bg-[#161616] p-4">
                  <h3 className="text-sm font-semibold text-[#F7E8E4]">Incident Information</h3>
                  <div className="mt-2 space-y-1 text-sm text-[#A8A29E]">
                    <p>Reported by: <span className="text-[#F7E8E4]">{selectedIncident.reportedBy.name}</span></p>
                    <p>Role: <span className="text-[#F7E8E4]">{selectedIncident.reportedBy.role}</span></p>
                    <p>Reported: <span className="text-[#F7E8E4]">{new Date(selectedIncident.createdAt).toLocaleString()}</span></p>
                    <p>Description: <span className="text-[#F7E8E4]">{selectedIncident.description || 'No description provided.'}</span></p>
                  </div>
                </article>

                <article className="rounded-lg border border-[#2a2a2a] bg-[#161616] p-4">
                  <h3 className="text-sm font-semibold text-[#F7E8E4]">Location Information</h3>
                  {selectedIncident.locationLogs[0] ? (
                    <div className="mt-2 grid gap-2 text-sm text-[#A8A29E] sm:grid-cols-2">
                      <p>Latitude: <span className="text-[#F7E8E4]">{selectedIncident.locationLogs[0].latitude}</span></p>
                      <p>Longitude: <span className="text-[#F7E8E4]">{selectedIncident.locationLogs[0].longitude}</span></p>
                      <p>Accuracy: <span className="text-[#F7E8E4]">{selectedIncident.locationLogs[0].accuracy ?? 'N/A'}</span></p>
                      <p>GPS timestamp: <span className="text-[#F7E8E4]">{new Date(selectedIncident.locationLogs[0].locationTimestamp).toLocaleString()}</span></p>
                      <p className="sm:col-span-2">Address: <span className="text-[#F7E8E4]">{selectedIncident.locationLogs[0].address ?? 'Unavailable'}</span></p>
                    </div>
                  ) : (
                    <p className="mt-2 text-sm text-[#A8A29E]">Location information is currently unavailable.</p>
                  )}
                </article>
              </div>

              <div className="mt-4 grid gap-4 xl:grid-cols-2">
                <article className="rounded-lg border border-[#2a2a2a] bg-[#161616] p-4">
                  <h3 className="text-sm font-semibold text-[#F7E8E4]">Incident Location</h3>
                  <p className="mt-1 text-xs text-[#A8A29E]">
                    {selectedIncident.locationLogs[0] ? `Location detected • Accuracy: ${selectedIncident.locationLogs[0].accuracy ?? 'N/A'}m` : 'Location unavailable'}
                  </p>
                  <div className="mt-3">
                    {selectedIncident.locationLogs.length ? <IncidentMap incident={selectedIncident} /> : <p className="text-sm text-[#A8A29E]">No map data available.</p>}
                  </div>
                </article>

                <article className="rounded-lg border border-[#2a2a2a] bg-[#161616] p-4">
                  <h3 className="text-sm font-semibold text-[#F7E8E4]">Incident Timeline</h3>
                  <div className="mt-2 space-y-2">
                    {timelineEvents(selectedIncident).map((event) => (
                      <div className="flex items-center justify-between rounded-md border border-[#2a2a2a] bg-[#111111] px-3 py-2" key={`${event.label}-${event.at}`}>
                        <p className="text-sm text-[#F7E8E4]">{event.label}</p>
                        <p className="text-xs text-[#A8A29E]">{new Date(event.at).toLocaleString()}</p>
                      </div>
                    ))}
                  </div>
                </article>
              </div>
            </section>
          ) : null}
        </>
      ) : null}
    </div>
  )
}
