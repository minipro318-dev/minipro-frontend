import { useMemo, useState } from 'react'
import { AdminHeader } from '../../components/admin-command/AdminHeader'
import { IncidentDetailDrawer } from '../../components/admin-command/IncidentDetailDrawer'
import { IncidentFilters } from '../../components/admin-command/IncidentFilters'
import { IncidentList } from '../../components/admin-command/IncidentList'
import { IncidentMapPanel } from '../../components/admin-command/IncidentMapPanel'
import { IncidentStats } from '../../components/admin-command/IncidentStats'
import type { IncidentFilterState } from '../../components/admin-command/types'
import { incidentDate } from '../../components/admin-command/incident-ui'
import { InlineAlert } from '../../components/ui'
import { useAuth } from '../../hooks/useAuth'
import { useIncidents } from '../../hooks/useIncidents'

export const AdminDashboard = () => {
  const { token } = useAuth()
  const { incidents, loading, error, message, setError, setMessage, resolveIncident, cancelIncident } = useIncidents(token)
  const [selectedIncidentId, setSelectedIncidentId] = useState<number | null>(null)
  const [filters, setFilters] = useState<IncidentFilterState>({
    search: '',
    status: 'ALL',
    type: 'ALL',
    date: '',
    sort: 'newest',
  })
  const [drawerOpen, setDrawerOpen] = useState(true)

  const incidentTypeOptions = useMemo(() => Array.from(new Set(incidents.map((incident) => incident.title))), [incidents])

  const filteredIncidents = useMemo(() => {
    const query = filters.search.trim().toLowerCase()
    const ordered = [...incidents].sort((a, b) =>
      filters.sort === 'newest'
        ? incidentDate(b).getTime() - incidentDate(a).getTime()
        : incidentDate(a).getTime() - incidentDate(b).getTime(),
    )

    return ordered.filter((incident) => {
      if (filters.status !== 'ALL' && incident.status !== filters.status) {
        return false
      }
      if (filters.type !== 'ALL' && incident.title !== filters.type) {
        return false
      }
      if (filters.date && new Date(incident.createdAt).toISOString().slice(0, 10) !== filters.date) {
        return false
      }
      if (!query) return true

      const latestAddress = incident.locationLogs[0]?.address?.toLowerCase() ?? ''
      return (
        incident.title.toLowerCase().includes(query) ||
        `incident #${incident.id}`.includes(query) ||
        incident.reportedBy.name.toLowerCase().includes(query) ||
        latestAddress.includes(query)
      )
    })
  }, [incidents, filters])

  const summary = useMemo(
    () => ({
      active: incidents.filter((incident) => incident.status === 'ACTIVE').length,
      pending: incidents.filter((incident) => incident.status === 'PENDING').length,
      resolved: incidents.filter((incident) => incident.status === 'RESOLVED').length,
      total: incidents.length,
    }),
    [incidents],
  )
  const recentActivity = useMemo(
    () =>
      [...incidents]
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
        .slice(0, 6)
        .map((incident) => {
          if (incident.status === 'RESOLVED') {
            const actor = incident.resolvedByRole
              ? incident.resolvedByRole.charAt(0) + incident.resolvedByRole.slice(1).toLowerCase()
              : 'System'
            return {
              id: `resolved-${incident.id}-${incident.updatedAt}`,
              text: `Incident #${incident.id} resolved by ${actor}`,
              at: incident.updatedAt,
            }
          }
          if (incident.status === 'ACTIVE') {
            return {
              id: `active-${incident.id}-${incident.updatedAt}`,
              text: `Incident #${incident.id} is active`,
              at: incident.updatedAt,
            }
          }
          return {
            id: `updated-${incident.id}-${incident.updatedAt}`,
            text: `Incident #${incident.id} updated`,
            at: incident.updatedAt,
          }
        }),
    [incidents],
  )

  const selectedIncident = useMemo(
    () =>
      filteredIncidents.find((incident) => incident.id === selectedIncidentId) ??
      filteredIncidents[0] ??
      null,
    [filteredIncidents, selectedIncidentId],
  )

  const onSelectIncident = (incidentId: number) => {
    setSelectedIncidentId(incidentId)
    setDrawerOpen(true)
  }

  const handleResolve = async (incidentId: number, resolutionNote?: string) => {
    setError('')
    setMessage('')
    await resolveIncident(incidentId, resolutionNote)
  }

  const handleCancel = async (incidentId: number) => {
    setError('')
    setMessage('')
    await cancelIncident(incidentId)
  }

  return (
    <div className="space-y-4">
      <AdminHeader activeCount={summary.active} />
      <IncidentStats summary={summary} />
      <IncidentFilters filters={filters} onChange={setFilters} types={incidentTypeOptions} />

      {error ? <InlineAlert message={error} /> : null}
      {message ? <p className="rounded-md border border-[var(--color-brand-border)] bg-[var(--color-brand-pink-light)] px-3 py-2 text-sm text-[var(--color-brand-pink)]">{message}</p> : null}

      {loading ? (
        <div className="rounded-xl border border-[var(--color-brand-border)] bg-[var(--color-brand-dark)] p-6 text-sm text-[var(--color-brand-muted)]">Loading incidents…</div>
      ) : (
        <>
          <section className="grid gap-3 xl:grid-cols-10">
            <div className="xl:col-span-4">
              <IncidentList
                incidents={filteredIncidents}
                onSelect={(incident) => onSelectIncident(incident.id)}
                selectedIncidentId={selectedIncident?.id ?? null}
              />
            </div>
            <div className="space-y-3 xl:col-span-6">
              <IncidentMapPanel incidents={filteredIncidents} selectedIncidentId={selectedIncident?.id ?? null} />
              <IncidentDetailDrawer
                incident={selectedIncident}
                onCancel={handleCancel}
                onClose={() => setDrawerOpen(false)}
                onResolve={handleResolve}
                open={drawerOpen}
              />
            </div>
          </section>
          <section className="rounded-xl border border-[var(--color-brand-border)] bg-[var(--color-brand-dark)] p-4">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-[var(--color-brand-muted)]">Recent Activity</h3>
            <div className="mt-3 space-y-2">
              {recentActivity.length ? (
                recentActivity.map((item) => (
                  <div className="flex items-center justify-between rounded-md border border-[var(--color-brand-border)] bg-[var(--color-brand-black-soft)] px-3 py-2 text-sm" key={item.id}>
                    <p className="text-[var(--color-brand-text)]">{item.text}</p>
                    <p className="text-xs text-[var(--color-brand-muted)]">{new Date(item.at).toLocaleString()}</p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-[var(--color-brand-muted)]">No activity yet.</p>
              )}
            </div>
          </section>
        </>
      )}
    </div>
  )
}
