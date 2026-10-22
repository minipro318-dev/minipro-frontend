import { useEffect, useMemo, useState } from 'react'
import { DashboardPanel } from '../../../components/dashboard'
import { InlineAlert } from '../../../components/ui'
import { useAuth } from '../../../hooks/useAuth'
import { aiSafetyEventApi } from '../../../services/ai-safety-event.api'
import { incidentApi } from '../../../services/incident.api'
import type { AiSafetyEvent } from '../../../types/ai-safety-event.types'
import type { Incident } from '../../../types/incident.types'

export const AdminOverview = () => {
  const { token } = useAuth()
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [aiEvents, setAiEvents] = useState<AiSafetyEvent[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    const run = async () => {
      if (!token) return
      try {
        const data = await incidentApi.list(token)
        const aiData = await aiSafetyEventApi.list(token, { limit: 50 })
        setIncidents(data.incidents)
        setAiEvents(aiData.events)
      } catch (apiError) {
        const message =
          typeof apiError === 'object' && apiError && 'message' in apiError && typeof apiError.message === 'string'
            ? apiError.message
            : 'Could not load overview.'
        setError(message)
      }
    }
    void run()
  }, [token])

  const stats = useMemo(() => {
    const active = incidents.filter((item) => item.status === 'ACTIVE').length
    const resolved = incidents.filter((item) => item.status === 'RESOLVED').length
    const cancelled = incidents.filter((item) => item.status === 'CANCELLED').length
    return { total: incidents.length, active, resolved, cancelled }
  }, [incidents])

  const aiStats = useMemo(() => {
    const pending = aiEvents.filter((event) => event.status === 'AWAITING_CONFIRMATION').length
    const escalated = aiEvents.filter((event) => event.status === 'ESCALATED').length
    const falseAlarms = aiEvents.filter((event) => event.status === 'FALSE_ALARM').length
    return { total: aiEvents.length, pending, escalated, falseAlarms }
  }, [aiEvents])

  return (
    <div className="space-y-6">
      <DashboardPanel
        description="Quick summary of platform incidents and current emergency load."
        title="Admin Overview"
      />
      {error ? <InlineAlert message={error} /> : null}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-brand-border bg-brand-dark p-4">
          <p className="text-sm text-brand-muted">Total Incidents</p>
          <p className="text-2xl font-bold text-brand-pink">{stats.total}</p>
        </div>
        <div className="rounded-xl border border-[var(--color-brand-border)] bg-brand-dark p-4">
          <p className="text-sm text-brand-muted">Active</p>
          <p className="text-2xl font-bold text-[var(--color-brand-pink)]">{stats.active}</p>
        </div>
        <div className="rounded-xl border border-[var(--color-brand-border)] bg-brand-dark p-4">
          <p className="text-sm text-brand-muted">Resolved</p>
          <p className="text-2xl font-bold text-[var(--color-brand-pink)]">{stats.resolved}</p>
        </div>
        <div className="rounded-xl border border-[var(--color-brand-border)] bg-brand-dark p-4">
          <p className="text-sm text-brand-muted">Cancelled</p>
          <p className="text-2xl font-bold text-[var(--color-brand-pink)]">{stats.cancelled}</p>
        </div>
      </section>
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-[var(--color-brand-border)] bg-brand-dark p-4">
          <p className="text-sm text-brand-muted">AI Events (Total)</p>
          <p className="text-2xl font-bold text-[var(--color-brand-pink)]">{aiStats.total}</p>
        </div>
        <div className="rounded-xl border border-amber-400/40 bg-brand-dark p-4">
          <p className="text-sm text-brand-muted">AI Pending Confirmations</p>
          <p className="text-2xl font-bold text-amber-300">{aiStats.pending}</p>
        </div>
        <div className="rounded-xl border border-red-400/40 bg-brand-dark p-4">
          <p className="text-sm text-brand-muted">AI Escalated</p>
          <p className="text-2xl font-bold text-red-300">{aiStats.escalated}</p>
        </div>
        <div className="rounded-xl border border-[var(--color-brand-border)] bg-brand-dark p-4">
          <p className="text-sm text-brand-muted">AI False Alarms</p>
          <p className="text-2xl font-bold text-[var(--color-brand-pink)]">{aiStats.falseAlarms}</p>
        </div>
      </section>
    </div>
  )
}
