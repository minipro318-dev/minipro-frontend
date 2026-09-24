import { useEffect, useState } from 'react'
import { DashboardPanel } from '../../components/dashboard'
import { IncidentCard, IncidentMap } from '../../components/incidents'
import { InlineAlert } from '../../components/ui'
import { useAuth } from '../../hooks/useAuth'
import { incidentApi } from '../../services/incident.api'
import { createRealtimeSocket, type IncidentRealtimePayload } from '../../services/realtime'
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

  useEffect(() => {
    if (!token) return
    const socket = createRealtimeSocket(token)

    const onIncidentCreated = (payload: IncidentRealtimePayload) => {
      setIncidents((previous) => [payload.incident, ...previous.filter((incident) => incident.id !== payload.incident.id)])
    }
    const onLocationUpdated = (payload: IncidentRealtimePayload) => {
      setIncidents((previous) => previous.map((incident) => (incident.id === payload.incident.id ? payload.incident : incident)))
    }
    const onStatusUpdated = (payload: IncidentRealtimePayload) => {
      setIncidents((previous) => previous.map((incident) => (incident.id === payload.incident.id ? payload.incident : incident)))
    }

    socket.on('incident:created', onIncidentCreated)
    socket.on('incident:location-updated', onLocationUpdated)
    socket.on('incident:status-updated', onStatusUpdated)

    return () => {
      socket.off('incident:created', onIncidentCreated)
      socket.off('incident:location-updated', onLocationUpdated)
      socket.off('incident:status-updated', onStatusUpdated)
      socket.disconnect()
    }
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
              <IncidentCard detailSlot={incident.locationLogs.length ? <IncidentMap incident={incident} /> : null} incident={incident} key={incident.id} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-brand-muted">No incidents available for linked users.</p>
        )}
      </section>
    </div>
  )
}
