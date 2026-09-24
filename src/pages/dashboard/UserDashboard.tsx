import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import type { Socket } from 'socket.io-client'
import { DashboardPanel } from '../../components/dashboard'
import { IncidentCard, IncidentMap } from '../../components/incidents'
import { FormField, InlineAlert, PrimaryButton, TextInput } from '../../components/ui'
import { useAuth } from '../../hooks/useAuth'
import { guardianInviteApi } from '../../services/guardian-invite.api'
import { incidentApi } from '../../services/incident.api'
import { createRealtimeSocket, type IncidentRealtimePayload } from '../../services/realtime'
import type { GuardianInvite } from '../../types/guardian-invite.types'
import type { Incident } from '../../types/incident.types'
import { isValidEmail } from '../../utils/validation'

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
  const [guardianInvites, setGuardianInvites] = useState<GuardianInvite[]>([])
  const [guardianName, setGuardianName] = useState('')
  const [guardianEmail, setGuardianEmail] = useState('')
  const [guardianMobile, setGuardianMobile] = useState('')
  const [inviteLoading, setInviteLoading] = useState(false)

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

  const loadGuardianInvites = useCallback(async () => {
    if (!token) return
    const data = await guardianInviteApi.list(token)
    setGuardianInvites(data.invites)
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
        await Promise.all([loadIncidents(), loadGuardianInvites()])
      } catch (apiError) {
        const apiMessage =
          typeof apiError === 'object' && apiError && 'message' in apiError && typeof apiError.message === 'string'
            ? apiError.message
            : 'Could not load incidents.'
        setError(apiMessage)
      }
    }
    void run()
  }, [loadIncidents, loadGuardianInvites])

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

  const onCreateGuardianInvite = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    setMessage('')

    if (!token) return
    const name = guardianName.trim()
    const email = guardianEmail.trim().toLowerCase()
    const mobile = guardianMobile.trim()

    if (!name || !email || !mobile) {
      setError('Guardian name, email and mobile are required.')
      return
    }
    if (!isValidEmail(email)) {
      setError('Please provide a valid guardian email.')
      return
    }

    try {
      setInviteLoading(true)
      const response = await guardianInviteApi.create(token, {
        guardianName: name,
        guardianEmail: email,
        guardianMobile: mobile,
      })
      setMessage(`Guardian invite email sent to ${response.invite.guardianEmail}. Invite code: ${response.invite.inviteCode}`)
      setGuardianName('')
      setGuardianEmail('')
      setGuardianMobile('')
      await loadGuardianInvites()
    } catch (apiError) {
      const apiMessage =
        typeof apiError === 'object' && apiError && 'message' in apiError && typeof apiError.message === 'string'
          ? apiError.message
          : 'Failed to create guardian invite.'
      setError(apiMessage)
    } finally {
      setInviteLoading(false)
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
        <h3 className="text-xl font-semibold text-brand-pink">Guardian Management</h3>
        <form className="space-y-3 rounded-xl border border-brand-border bg-brand-dark p-4 shadow-brand-soft" onSubmit={onCreateGuardianInvite}>
          <FormField id="guardianName" label="Guardian Name">
            <TextInput
              id="guardianName"
              onChange={(event) => setGuardianName(event.target.value)}
              placeholder="Enter guardian full name"
              value={guardianName}
            />
          </FormField>
          <div className="grid gap-3 md:grid-cols-2">
            <FormField id="guardianEmail" label="Guardian Email">
              <TextInput
                id="guardianEmail"
                onChange={(event) => setGuardianEmail(event.target.value)}
                placeholder="guardian@example.com"
                type="email"
                value={guardianEmail}
              />
            </FormField>
            <FormField id="guardianMobile" label="Guardian Mobile">
              <TextInput
                id="guardianMobile"
                onChange={(event) => setGuardianMobile(event.target.value)}
                placeholder="9876543210"
                value={guardianMobile}
              />
            </FormField>
          </div>
          <PrimaryButton disabled={inviteLoading} type="submit">
            {inviteLoading ? 'Creating Invite...' : 'Add Guardian & Create Invite'}
          </PrimaryButton>
        </form>

        {guardianInvites.length ? (
          <div className="space-y-2">
            {guardianInvites.map((invite) => (
              <div className="rounded-lg border border-brand-border-soft/50 bg-brand-black/70 p-3 text-sm" key={invite.id}>
                <p className="font-medium text-brand-pink">{invite.guardianName}</p>
                <p className="text-brand-muted">{invite.guardianEmail} • {invite.guardianMobile}</p>
                <p>Invite code: <span className="font-semibold">{invite.inviteCode}</span></p>
                <p>Status: {invite.status}</p>
                <p>Expires: {new Date(invite.expiresAt).toLocaleString()}</p>
                <p className="text-xs text-brand-muted">
                  Share this link: {window.location.origin}/guardian-accept?code={invite.inviteCode}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-brand-muted">No guardian invites yet.</p>
        )}
      </section>

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
