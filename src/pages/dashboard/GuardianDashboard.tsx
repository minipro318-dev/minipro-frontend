import { useEffect, useState } from 'react'
import { DashboardPanel } from '../../components/dashboard'
import { IncidentCard } from '../../components/incidents'
import { InlineAlert } from '../../components/ui'
import { useAuth } from '../../hooks/useAuth'
import { incidentApi } from '../../services/incident.api'
import type { Incident } from '../../types/incident.types'

export const GuardianDashboard = () => {
  const { token } = useAuth()
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    const run = async () => {
      if (!token) return
      try {
        const data = await incidentApi.list(token)
        setIncidents(data.incidents)
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

  return (
    <div className="space-y-6">
      <DashboardPanel
        description="Track incidents raised by linked end users. You have read-only visibility in this MVP."
        title="Guardian Dashboard"
      />

      {error ? <InlineAlert message={error} /> : null}

      <section className="space-y-3">
        <h3 className="text-xl font-semibold text-brand-pink">Linked Users Incidents</h3>
        {incidents.length ? (
          <div className="space-y-3">
            {incidents.map((incident) => (
              <IncidentCard incident={incident} key={incident.id} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-brand-muted">No incidents available for linked users.</p>
        )}
      </section>
    </div>
  )
}
