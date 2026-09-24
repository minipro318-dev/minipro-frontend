import { useCallback, useEffect, useState } from 'react'
import { incidentApi } from '../services/incident.api'
import { createRealtimeSocket, type IncidentRealtimePayload } from '../services/realtime'
import type { Incident } from '../types/incident.types'

type UseIncidentsResult = {
  incidents: Incident[]
  loading: boolean
  error: string
  message: string
  setError: (value: string) => void
  setMessage: (value: string) => void
  refreshIncidents: () => Promise<void>
  resolveIncident: (incidentId: number) => Promise<void>
  cancelIncident: (incidentId: number) => Promise<void>
}

const getApiMessage = (apiError: unknown, fallback: string) =>
  typeof apiError === 'object' && apiError && 'message' in apiError && typeof apiError.message === 'string'
    ? apiError.message
    : fallback

export const useIncidents = (token: string | null): UseIncidentsResult => {
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const refreshIncidents = useCallback(async () => {
    if (!token) return
    const data = await incidentApi.list(token)
    setIncidents(data.incidents)
  }, [token])

  useEffect(() => {
    const run = async () => {
      if (!token) {
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        await refreshIncidents()
      } catch (apiError) {
        setError(getApiMessage(apiError, 'Could not load incidents.'))
      } finally {
        setLoading(false)
      }
    }
    void run()
  }, [token, refreshIncidents])

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

  const resolveIncident = useCallback(
    async (incidentId: number) => {
      if (!token) return
      setError('')
      setMessage('')
      try {
        await incidentApi.resolve(token, incidentId)
        setMessage(`Incident #${incidentId} marked as resolved.`)
        await refreshIncidents()
      } catch (apiError) {
        setError(getApiMessage(apiError, 'Failed to resolve incident.'))
      }
    },
    [token, refreshIncidents],
  )

  const cancelIncident = useCallback(
    async (incidentId: number) => {
      if (!token) return
      setError('')
      setMessage('')
      try {
        await incidentApi.cancel(token, incidentId)
        setMessage(`Incident #${incidentId} cancelled.`)
        await refreshIncidents()
      } catch (apiError) {
        setError(getApiMessage(apiError, 'Failed to cancel incident.'))
      }
    },
    [token, refreshIncidents],
  )

  return {
    incidents,
    loading,
    error,
    message,
    setError,
    setMessage,
    refreshIncidents,
    resolveIncident,
    cancelIncident,
  }
}

