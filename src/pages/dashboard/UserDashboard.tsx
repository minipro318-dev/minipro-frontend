import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import type { Socket } from 'socket.io-client'
import { DashboardPanel } from '../../components/dashboard'
import { IncidentCard, IncidentMap } from '../../components/incidents'
import { FormField, InlineAlert, PrimaryButton, TextInput } from '../../components/ui'
import { useAuth } from '../../hooks/useAuth'
import { incidentApi } from '../../services/incident.api'
import { createRealtimeSocket, type IncidentRealtimePayload } from '../../services/realtime'
import type { Incident } from '../../types/incident.types'

type LocationSnapshot = {
  latitude: number
  longitude: number
  accuracy: number | null
  locationTimestamp: string
}

const getLocationErrorMessage = (error: GeolocationPositionError) => {
  if (error.code === error.PERMISSION_DENIED) {
    return 'Location permission is required to trigger SOS. Please allow location access and try again.'
  }
  if (error.code === error.TIMEOUT) {
    return 'Timed out while getting your location. Please retry.'
  }
  return 'Unable to get your current location right now. Please retry.'
}

const getCurrentLocation = (): Promise<LocationSnapshot> =>
  new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by this browser.'))
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: Number.isFinite(position.coords.accuracy) ? position.coords.accuracy : null,
          locationTimestamp: new Date(position.timestamp).toISOString(),
        })
      },
      (error) => reject(error),
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 0,
      },
    )
  })

export const UserDashboard = () => {
  const { token, user } = useAuth()
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [title, setTitle] = useState('Emergency SOS')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [locationState, setLocationState] = useState<'idle' | 'getting' | 'ready'>('idle')
  const [lastKnownLocation, setLastKnownLocation] = useState<LocationSnapshot | null>(null)
  const [trackingIncidentId, setTrackingIncidentId] = useState<number | null>(null)

  const socketRef = useRef<Socket | null>(null)
  const watchIdRef = useRef<number | null>(null)
  const sendingLocationRef = useRef(false)

  const activeIncident = useMemo(
    () => incidents.find((incident) => incident.id === trackingIncidentId || incident.status === 'ACTIVE'),
    [incidents, trackingIncidentId],
  )

  const loadIncidents = useCallback(async () => {
    if (!token) return
    const data = await incidentApi.list(token)
    setIncidents(data.incidents)
  }, [token])

  const stopLiveTracking = useCallback(() => {
    if (watchIdRef.current !== null && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchIdRef.current)
    }
    watchIdRef.current = null
    setTrackingIncidentId(null)
  }, [])

  const sendLocationUpdate = useCallback(
    async (incidentId: number, location: LocationSnapshot) => {
      if (!token || sendingLocationRef.current) return
      sendingLocationRef.current = true
      try {
        await incidentApi.addLocation(token, incidentId, {
          latitude: location.latitude,
          longitude: location.longitude,
          accuracy: location.accuracy ?? undefined,
          locationTimestamp: location.locationTimestamp,
        })
      } catch {
        setError('Live location update failed due to network issue. We will retry on next location update.')
      } finally {
        sendingLocationRef.current = false
      }
    },
    [token],
  )

  const startLiveTracking = useCallback(
    (incidentId: number) => {
      if (!navigator.geolocation) return
      if (watchIdRef.current !== null) return

      const watchId = navigator.geolocation.watchPosition(
        (position) => {
          const location: LocationSnapshot = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: Number.isFinite(position.coords.accuracy) ? position.coords.accuracy : null,
            locationTimestamp: new Date(position.timestamp).toISOString(),
          }
          setLastKnownLocation(location)
          setLocationState('ready')
          void sendLocationUpdate(incidentId, location)
        },
        (positionError) => {
          setError(getLocationErrorMessage(positionError))
          if (positionError.code === positionError.PERMISSION_DENIED) {
            stopLiveTracking()
          }
        },
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 5000,
        },
      )

      watchIdRef.current = watchId
      setTrackingIncidentId(incidentId)
    },
    [sendLocationUpdate, stopLiveTracking],
  )

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
    socketRef.current = socket

    const onIncidentCreated = (payload: IncidentRealtimePayload) => {
      setIncidents((previous) => [payload.incident, ...previous.filter((incident) => incident.id !== payload.incident.id)])
      if (payload.userId === user?.id && payload.status === 'ACTIVE') {
        startLiveTracking(payload.incidentId)
      }
    }
    const onLocationUpdated = (payload: IncidentRealtimePayload) => {
      setIncidents((previous) => previous.map((incident) => (incident.id === payload.incident.id ? payload.incident : incident)))
    }
    const onStatusUpdated = (payload: IncidentRealtimePayload) => {
      setIncidents((previous) => previous.map((incident) => (incident.id === payload.incident.id ? payload.incident : incident)))
      if (trackingIncidentId && payload.incidentId === trackingIncidentId && payload.status !== 'ACTIVE') {
        stopLiveTracking()
      }
    }

    socket.on('incident:created', onIncidentCreated)
    socket.on('incident:location-updated', onLocationUpdated)
    socket.on('incident:status-updated', onStatusUpdated)

    return () => {
      socket.off('incident:created', onIncidentCreated)
      socket.off('incident:location-updated', onLocationUpdated)
      socket.off('incident:status-updated', onStatusUpdated)
      socket.disconnect()
      socketRef.current = null
    }
  }, [token, user?.id, startLiveTracking, trackingIncidentId, stopLiveTracking])

  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible' && trackingIncidentId) {
        void (async () => {
          try {
            const location = await getCurrentLocation()
            setLastKnownLocation(location)
            void sendLocationUpdate(trackingIncidentId, location)
          } catch {
            // no-op
          }
        })()
      }
    }

    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => document.removeEventListener('visibilitychange', onVisibilityChange)
  }, [trackingIncidentId, sendLocationUpdate])

  useEffect(
    () => () => {
      stopLiveTracking()
    },
    [stopLiveTracking],
  )

  const onTriggerSos = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    setMessage('')

    if (!token) return
    if (!title.trim()) {
      setError('SOS title is required.')
      return
    }

    try {
      setLoading(true)
      setLocationState('getting')
      const location = await getCurrentLocation()
      setLastKnownLocation(location)
      setLocationState('ready')

      const response = await incidentApi.triggerSos(token, {
        title: title.trim(),
        description: description.trim() || undefined,
        latitude: location.latitude,
        longitude: location.longitude,
        accuracy: location.accuracy ?? undefined,
        locationTimestamp: location.locationTimestamp,
      })

      setMessage('SOS alert sent successfully. Live location tracking started.')
      setDescription('')
      setIncidents((previous) => [response.incident, ...previous.filter((incident) => incident.id !== response.incident.id)])
      startLiveTracking(response.incident.id)
    } catch (apiError) {
      if (apiError && typeof apiError === 'object' && 'code' in apiError) {
        setError(getLocationErrorMessage(apiError as GeolocationPositionError))
      } else {
        const apiMessage =
          typeof apiError === 'object' && apiError && 'message' in apiError && typeof apiError.message === 'string'
            ? apiError.message
            : 'Failed to create SOS incident.'
        setError(apiMessage)
      }
      setLocationState('idle')
    } finally {
      setLoading(false)
    }
  }

  const onCancelIncident = async (incidentId: number) => {
    if (!token) return
    setError('')
    setMessage('')
    try {
      await incidentApi.cancel(token, incidentId)
      await loadIncidents()
      setMessage(`Incident #${incidentId} cancelled successfully.`)
      if (trackingIncidentId === incidentId) {
        stopLiveTracking()
      }
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
        description="Trigger SOS alerts with automatic location capture and share live updates with authorized recipients."
        title="End User Dashboard"
      />

      <form className="space-y-4 rounded-xl border border-brand-border bg-brand-dark p-4 shadow-brand-soft" onSubmit={onTriggerSos}>
        <h3 className="text-xl font-semibold text-brand-pink">Trigger SOS</h3>
        <FormField id="title" label="Title">
          <TextInput id="title" onChange={(e) => setTitle(e.target.value)} value={title} />
        </FormField>
        <FormField id="description" label="Description (optional)">
          <TextInput id="description" onChange={(e) => setDescription(e.target.value)} value={description} />
        </FormField>

        <div className="rounded-md border border-brand-border-soft/60 bg-brand-black/70 px-3 py-2 text-sm">
          <p className="font-medium text-brand-pink">Location</p>
          {locationState === 'getting' ? (
            <p className="text-brand-muted">Getting your current location...</p>
          ) : locationState === 'ready' && lastKnownLocation ? (
            <div className="text-brand-muted">
              <p>Current location detected.</p>
              <p>Accuracy: {lastKnownLocation.accuracy ?? 'Not available'}</p>
              <p>Location timestamp: {new Date(lastKnownLocation.locationTimestamp).toLocaleString()}</p>
            </div>
          ) : (
            <p className="text-brand-muted">Current location will be detected automatically when you trigger SOS.</p>
          )}
        </div>

        {error ? <InlineAlert message={error} /> : null}
        {message ? <p className="rounded-md border border-emerald-500/60 bg-emerald-950/40 px-3 py-2 text-sm text-emerald-200">{message}</p> : null}
        <PrimaryButton disabled={loading} type="submit">
          {loading ? 'Getting your location...' : 'Trigger SOS Alert'}
        </PrimaryButton>
      </form>

      <section className="space-y-3">
        <h3 className="text-xl font-semibold text-brand-pink">My Incidents</h3>
        {incidents.length ? (
          <div className="space-y-3">
            {incidents.map((incident) => (
              <IncidentCard
                actionSlot={
                  incident.status === 'ACTIVE' ? (
                    <PrimaryButton className="w-auto px-3 py-1 text-sm" onClick={() => void onCancelIncident(incident.id)} type="button">
                      Cancel Incident
                    </PrimaryButton>
                  ) : null
                }
                detailSlot={incident.locationLogs.length ? <IncidentMap incident={incident} /> : null}
                incident={incident}
                key={incident.id}
              />
            ))}
          </div>
        ) : (
          <p className="text-sm text-brand-muted">No incidents found yet.</p>
        )}
      </section>

      {activeIncident ? (
        <p className="text-xs text-brand-muted">
          Live tracking status: {activeIncident.status === 'ACTIVE' ? 'active (sending updates while this tab is running).' : 'inactive'}
        </p>
      ) : null}
    </div>
  )
}
