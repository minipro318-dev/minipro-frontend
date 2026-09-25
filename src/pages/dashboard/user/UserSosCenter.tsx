import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { IncidentActions } from '../../../components/admin-command/IncidentActions'
import { StatusBadge } from '../../../components/common/StatusBadge'
import { FormField, InlineAlert, TextInput } from '../../../components/ui'
import { useAuth } from '../../../hooks/useAuth'
import { guardianInviteApi } from '../../../services/guardian-invite.api'
import { incidentApi } from '../../../services/incident.api'
import { createRealtimeSocket, type IncidentRealtimePayload } from '../../../services/realtime'
import type { GuardianInvite } from '../../../types/guardian-invite.types'
import type { Incident } from '../../../types/incident.types'

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
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 },
    )
  })

export const UserSosCenter = () => {
  const { token, user } = useAuth()
  const [title, setTitle] = useState('Emergency SOS')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [locationState, setLocationState] = useState<'idle' | 'getting' | 'ready'>('idle')
  const [lastKnownLocation, setLastKnownLocation] = useState<LocationSnapshot | null>(null)
  const [trackingIncidentId, setTrackingIncidentId] = useState<number | null>(null)
  const [activeIncident, setActiveIncident] = useState<Incident | null>(null)
  const [latestIncident, setLatestIncident] = useState<Incident | null>(null)
  const [invites, setInvites] = useState<GuardianInvite[]>([])
  const [confirmOpen, setConfirmOpen] = useState(false)
  const watchIdRef = useRef<number | null>(null)
  const sendingLocationRef = useRef(false)

  const stopLiveTracking = useCallback(() => {
    if (watchIdRef.current !== null && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchIdRef.current)
    }
    watchIdRef.current = null
    setTrackingIncidentId(null)
  }, [])

  const sendLocationUpdate = useCallback(async (incidentId: number, location: LocationSnapshot) => {
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
      setError('Live location update failed due to network issue. We will retry on next update.')
    } finally {
      sendingLocationRef.current = false
    }
  }, [token])

  const startLiveTracking = useCallback((incidentId: number) => {
    if (!navigator.geolocation || watchIdRef.current !== null) return
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
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 5000 },
    )

    watchIdRef.current = watchId
    setTrackingIncidentId(incidentId)
  }, [sendLocationUpdate, stopLiveTracking])

  useEffect(() => () => stopLiveTracking(), [stopLiveTracking])

  const loadPageData = useCallback(async () => {
    if (!token) return
    const [incidentData, inviteData] = await Promise.all([incidentApi.list(token), guardianInviteApi.list(token)])
    const orderedIncidents = [...incidentData.incidents].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    const currentActive = incidentData.incidents.find((item) => item.status === 'ACTIVE') ?? null
    setLatestIncident(orderedIncidents[0] ?? null)
    setActiveIncident(currentActive)
    setInvites(inviteData.invites)
    if (currentActive && trackingIncidentId === null) {
      startLiveTracking(currentActive.id)
    }
  }, [token, startLiveTracking, trackingIncidentId])

  useEffect(() => {
    const run = async () => {
      try {
        await loadPageData()
      } catch (apiError) {
        const apiMessage =
          typeof apiError === 'object' && apiError && 'message' in apiError && typeof apiError.message === 'string'
            ? apiError.message
            : 'Could not load SOS center.'
        setError(apiMessage)
      }
    }
    void run()
  }, [loadPageData])

  useEffect(() => {
    if (!token) return
    const socket = createRealtimeSocket(token)

    const applyIncidentUpdate = (payload: IncidentRealtimePayload) => {
      if (payload.incident.reportedById !== user?.id) return
      setLatestIncident((previous) => {
        if (!previous) return payload.incident
        return new Date(payload.incident.updatedAt).getTime() >= new Date(previous.updatedAt).getTime() ? payload.incident : previous
      })
      if (payload.incident.status === 'ACTIVE') {
        setActiveIncident(payload.incident)
        if (trackingIncidentId === null) {
          startLiveTracking(payload.incident.id)
        }
      } else if (activeIncident?.id === payload.incident.id) {
        setActiveIncident(null)
        if (trackingIncidentId === payload.incident.id) {
          stopLiveTracking()
        }
      }
    }

    socket.on('incident:created', applyIncidentUpdate)
    socket.on('incident:location-updated', applyIncidentUpdate)
    socket.on('incident:status-updated', applyIncidentUpdate)

    return () => {
      socket.off('incident:created', applyIncidentUpdate)
      socket.off('incident:location-updated', applyIncidentUpdate)
      socket.off('incident:status-updated', applyIncidentUpdate)
      socket.disconnect()
    }
  }, [token, user?.id, trackingIncidentId, startLiveTracking, activeIncident?.id, stopLiveTracking])

  const submitSos = async () => {
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

      setDescription('')
      setMessage(`SOS #${response.incident.id} sent successfully. Live tracking started.`)
      setActiveIncident(response.incident)
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

  const onTriggerSos = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setConfirmOpen(true)
  }

  const onCancelActiveIncident = async (incidentId: number) => {
    if (!token) return
    setError('')
    setMessage('')
    try {
      await incidentApi.cancel(token, incidentId)
      setMessage(`Incident #${incidentId} cancelled successfully.`)
      setActiveIncident(null)
      stopLiveTracking()
      await loadPageData()
    } catch (apiError) {
      const apiMessage =
        typeof apiError === 'object' && apiError && 'message' in apiError && typeof apiError.message === 'string'
          ? apiError.message
          : 'Failed to cancel incident.'
      setError(apiMessage)
    }
  }

  const onResolveActiveIncident = async (incidentId: number, resolutionNote?: string) => {
    if (!token) return
    setError('')
    setMessage('')
    try {
      const response = await incidentApi.resolve(token, incidentId, { resolutionNote })
      setActiveIncident(response.incident.status === 'ACTIVE' ? response.incident : null)
      setLatestIncident(response.incident)
      stopLiveTracking()
      setMessage(`Incident #${incidentId} marked as resolved.`)
    } catch (apiError) {
      const apiMessage =
        typeof apiError === 'object' && apiError && 'message' in apiError && typeof apiError.message === 'string'
          ? apiError.message
          : 'Failed to resolve incident.'
      setError(apiMessage)
    }
  }

  const connectedGuardians = invites.filter((invite) => invite.status === 'ACCEPTED').length

  return (
    <div className="mx-auto w-full max-w-3xl space-y-4">
      <section className="rounded-xl border border-[var(--color-brand-border)] bg-[var(--color-brand-dark)] p-5">
        <h2 className="text-2xl font-semibold text-[var(--color-brand-text)]">SOS Center</h2>
        <p className="mt-1 text-sm text-[var(--color-brand-muted)]">Trigger SOS with automatic location detection and live location sharing.</p>
      </section>

      {activeIncident ? (
        <section className="rounded-xl border border-[var(--color-brand-pink)]/40 bg-[var(--color-brand-pink-light)] p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-lg font-semibold text-[var(--color-brand-pink)]">SOS ACTIVE</p>
              <p className="text-sm text-[var(--color-brand-salmon)]">Live location sharing is active for Incident #{activeIncident.id}</p>
            </div>
            <StatusBadge label="Emergency Active" tone="danger" />
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link className="rounded-md border border-[var(--color-brand-border)] px-3 py-2 text-sm hover:bg-[var(--color-brand-pink-light)]" to="/dashboard/user/incidents">
              View Incident
            </Link>
          </div>
          <IncidentActions
            incidentId={activeIncident.id}
            onCancel={onCancelActiveIncident}
            onResolve={onResolveActiveIncident}
            resolveButtonLabel="Mark Emergency Resolved"
            status={activeIncident.status}
          />
        </section>
      ) : null}

      {!activeIncident && latestIncident?.status === 'RESOLVED' ? (
        <section className="rounded-xl border border-[var(--color-brand-border)] bg-[var(--color-brand-dark)] p-4 text-sm">
          <p className="font-semibold text-[var(--color-brand-text)]">Latest emergency resolved</p>
          <p className="mt-1 text-[var(--color-brand-muted)]">
            Incident #{latestIncident.id} was resolved by {latestIncident.resolvedByRole ?? 'UNKNOWN'}
            {latestIncident.resolvedAt ? ` on ${new Date(latestIncident.resolvedAt).toLocaleString()}` : ''}.
          </p>
          {latestIncident.resolutionNote ? <p className="mt-1 text-[var(--color-brand-muted)]">Note: {latestIncident.resolutionNote}</p> : null}
        </section>
      ) : null}

      <form className="space-y-4 rounded-xl border border-[var(--color-brand-border)] bg-[var(--color-brand-dark)] p-5" onSubmit={onTriggerSos}>
        <div>
          <p className="text-xl font-semibold text-[var(--color-brand-text)]">Emergency SOS</p>
          <p className="text-sm text-[var(--color-brand-muted)]">Use this only in emergency situations.</p>
        </div>
        <FormField id="title" label="Title">
          <TextInput id="title" onChange={(event) => setTitle(event.target.value)} value={title} />
        </FormField>
        <FormField id="description" label="Description (optional)">
          <TextInput id="description" onChange={(event) => setDescription(event.target.value)} value={description} />
        </FormField>

        <div className="grid gap-3 rounded-lg border border-[var(--color-brand-border)] bg-[var(--color-brand-black-soft)] p-3 text-sm sm:grid-cols-2">
          <div>
            <p className="text-xs uppercase tracking-widest text-[var(--color-brand-muted)]">Location</p>
            <p className="text-[var(--color-brand-text)]">{locationState === 'ready' ? 'Current location available' : 'Will detect on trigger'}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-widest text-[var(--color-brand-muted)]">Guardians</p>
            <p className="text-[var(--color-brand-text)]">{connectedGuardians} connected</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-widest text-[var(--color-brand-muted)]">Live Tracking</p>
            <p className="text-[var(--color-brand-text)]">{trackingIncidentId ? 'Active' : 'Inactive'}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-widest text-[var(--color-brand-muted)]">GPS</p>
            <p className="text-[var(--color-brand-text)]">
              {lastKnownLocation ? `Accuracy ${lastKnownLocation.accuracy ?? 'N/A'}` : 'Waiting for location'}
            </p>
          </div>
        </div>

        {error ? <InlineAlert message={error} /> : null}
        {message ? <p className="rounded-md border border-[var(--color-brand-border)] bg-[var(--color-brand-pink-light)] px-3 py-2 text-sm text-[var(--color-brand-pink)]">{message}</p> : null}
        <button
          className="rounded-md bg-[var(--color-brand-pink)] px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70"
          disabled={loading}
          type="submit"
        >
          {loading ? 'Getting your location...' : 'Trigger SOS Alert'}
        </button>
      </form>

      {confirmOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-brand-black/65 p-4">
          <div className="w-full max-w-md rounded-xl border border-[var(--color-brand-border)] bg-[var(--color-brand-dark)] p-5">
            <h3 className="text-lg font-semibold text-[var(--color-brand-text)]">Confirm emergency SOS?</h3>
            <p className="mt-2 text-sm text-[var(--color-brand-muted)]">
              This will trigger an emergency incident and start live location sharing with authorized recipients.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                className="rounded-lg border border-[var(--color-brand-border)] px-3 py-2 text-sm text-[var(--color-brand-text)] hover:bg-[var(--color-brand-black-soft)]"
                onClick={() => setConfirmOpen(false)}
                type="button"
              >
                Cancel
              </button>
              <button
                className="rounded-lg bg-[var(--color-brand-pink)] px-3 py-2 text-sm font-semibold text-[white] hover:brightness-95"
                onClick={() => {
                  setConfirmOpen(false)
                  void submitSos()
                }}
                type="button"
              >
                Confirm SOS
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
