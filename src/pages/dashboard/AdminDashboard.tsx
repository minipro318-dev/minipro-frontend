import { useCallback, useEffect, useState } from 'react'
import { DashboardPanel } from '../../components/dashboard'
import { IncidentCard, IncidentMap } from '../../components/incidents'
import { InlineAlert, PrimaryButton } from '../../components/ui'
import { useAuth } from '../../hooks/useAuth'
import { incidentApi } from '../../services/incident.api'
import { createRealtimeSocket, type IncidentRealtimePayload } from '../../services/realtime'
import type { Incident } from '../../types/incident.types'

export const AdminDashboard = () => {
  const { token } = useAuth()
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const loadIncidents = useCallback(async () => {
    if (!token) return
    const data = await incidentApi.list(token)
    setIncidents(data.incidents)
  }, [token])

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
  }, [loadIncidents])

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

  const onResolve = async (incidentId: number) => {
    if (!token) return
    setError('')
    setMessage('')
    try {
      await incidentApi.resolve(token, incidentId)
      setMessage(`Incident #${incidentId} marked as resolved.`)
      await loadIncidents()
    } catch (apiError) {
      const apiMessage =
        typeof apiError === 'object' && apiError && 'message' in apiError && typeof apiError.message === 'string'
          ? apiError.message
          : 'Failed to resolve incident.'
      setError(apiMessage)
    }
  }

  const onCancel = async (incidentId: number) => {
    if (!token) return
    setError('')
    setMessage('')
    try {
      await incidentApi.cancel(token, incidentId)
      setMessage(`Incident #${incidentId} cancelled by admin.`)
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
    <div className="space-y-6">
      <DashboardPanel
        description="Monitor and manage all SOS incidents. Admin can resolve or cancel active incidents."
        title="Admin Dashboard"
      />

      {error ? <InlineAlert message={error} /> : null}
      {message ? <p className="rounded-md border border-emerald-500/60 bg-emerald-950/40 px-3 py-2 text-sm text-emerald-200">{message}</p> : null}

      <section className="space-y-3">
        <h3 className="text-xl font-semibold text-brand-pink">All Incidents</h3>
        {incidents.length ? (
          <div className="space-y-3">
            {incidents.map((incident) => (
              <IncidentCard
                actionSlot={
                  incident.status === 'ACTIVE' ? (
                    <>
                      <PrimaryButton className="w-auto px-3 py-1 text-sm" onClick={() => void onResolve(incident.id)} type="button">
                        Resolve
                      </PrimaryButton>
                      <button
                        className="cursor-pointer rounded-md border border-brand-border px-3 py-1 text-sm hover:bg-brand-pink hover:text-brand-black"
                        onClick={() => void onCancel(incident.id)}
                        type="button"
                      >
                        Cancel
                      </button>
                    </>
                  ) : null
                }
                detailSlot={incident.locationLogs.length ? <IncidentMap incident={incident} /> : null}
                incident={incident}
                key={incident.id}
              />
            ))}
          </div>
        ) : (
          <p className="text-sm text-brand-muted">No incidents available.</p>
        )}
      </section>
    </div>
  )
}
