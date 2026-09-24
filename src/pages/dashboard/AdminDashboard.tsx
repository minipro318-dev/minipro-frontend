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

  const handleResolve = async (incidentId: number) => {
    setError('')
    setMessage('')
    await resolveIncident(incidentId)
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
      {message ? <p className="rounded-md border border-emerald-500/60 bg-emerald-950/40 px-3 py-2 text-sm text-emerald-200">{message}</p> : null}

      {loading ? (
        <div className="rounded-xl border border-[#252525] bg-[#111111] p-6 text-sm text-[#A8A29E]">Loading incidents…</div>
      ) : (
        <section className="grid gap-3 xl:grid-cols-10">
          <div className="xl:col-span-4">
            <IncidentList
              incidents={filteredIncidents}
              onSelect={(incident) => onSelectIncident(incident.id)}
              selectedIncidentId={selectedIncident?.id ?? null}
            />
          </div>
          <div className="relative xl:col-span-6">
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
      )}
    </div>
  )
}
