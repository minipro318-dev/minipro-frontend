import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import 'leaflet/dist/leaflet.css'
import type { LeafletMouseEvent } from 'leaflet'
import { MapContainer, Marker, Polyline, TileLayer, useMap, useMapEvents } from 'react-leaflet'
import { getLocationPinIcon } from '../../../components/maps/map-marker-icons'
import { FormField, InlineAlert, TextInput } from '../../../components/ui'
import { useAuth } from '../../../hooks/useAuth'
import { journeyApi } from '../../../services/journey.api'
import {
  createRealtimeSocket,
  type JourneyGuardianResponseRealtimePayload,
  type JourneyRealtimePayload,
} from '../../../services/realtime'
import type {
  Journey,
  JourneyDestinationSuggestion,
  JourneyEvent,
  JourneyRoutePreview,
  JourneyStatus,
} from '../../../types/journey.types'

type PositionSnapshot = {
  latitude: number
  longitude: number
  accuracy: number | null
  locationTimestamp: string
}

type DestinationDraft = {
  address: string
  latitude: number
  longitude: number
}

type TimelineItem = {
  id: string
  eventType: string
  message: string
  createdAt: string
  icon: string
  iconClass: string
}

type JourneyConfirmDialog =
  | {
      action: 'complete' | 'cancel'
      journeyId: number
    }
  | null

const getApiMessage = (apiError: unknown, fallback: string) =>
  typeof apiError === 'object' && apiError && 'message' in apiError && typeof apiError.message === 'string'
    ? apiError.message
    : fallback

const decodePolyline = (encoded: string): [number, number][] => {
  let index = 0
  let lat = 0
  let lng = 0
  const coordinates: [number, number][] = []

  while (index < encoded.length) {
    let shift = 0
    let result = 0
    let byte: number
    do {
      byte = encoded.charCodeAt(index++) - 63
      result |= (byte & 0x1f) << shift
      shift += 5
    } while (byte >= 0x20)
    const deltaLat = (result & 1) !== 0 ? ~(result >> 1) : result >> 1
    lat += deltaLat

    shift = 0
    result = 0
    do {
      byte = encoded.charCodeAt(index++) - 63
      result |= (byte & 0x1f) << shift
      shift += 5
    } while (byte >= 0x20)
    const deltaLng = (result & 1) !== 0 ? ~(result >> 1) : result >> 1
    lng += deltaLng

    coordinates.push([lat / 1e5, lng / 1e5])
  }

  return coordinates
}

const readCurrentPosition = (): Promise<PositionSnapshot> =>
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

const distanceText = (distanceMeters: number | null) => {
  if (typeof distanceMeters !== 'number' || !Number.isFinite(distanceMeters)) return 'N/A'
  return distanceMeters < 1000 ? `${Math.round(distanceMeters)} m` : `${(distanceMeters / 1000).toFixed(1)} km`
}

const formatDateTime = (value: string | null) => (value ? new Date(value).toLocaleString() : 'N/A')

const truncateText = (value: string, maxLength = 88) =>
  value.length <= maxLength ? value : `${value.slice(0, maxLength - 1)}…`

const isJourneyLive = (status: Journey['status']) =>
  status === 'ACTIVE' || status === 'CHECK_IN_REQUIRED' || status === 'ESCALATED'

const statusStyle: Record<JourneyStatus, { label: string; className: string }> = {
  ACTIVE: {
    label: 'ACTIVE',
    className: 'border-blue-200 bg-blue-50 text-blue-700',
  },
  CHECK_IN_REQUIRED: {
    label: 'CHECK-IN REQUIRED',
    className: 'border-amber-300 bg-amber-50 text-amber-700',
  },
  ESCALATED: {
    label: 'ESCALATED',
    className: 'border-red-300 bg-red-50 text-red-700',
  },
  COMPLETED: {
    label: 'COMPLETED',
    className: 'border-emerald-300 bg-emerald-50 text-emerald-700',
  },
  CANCELLED: {
    label: 'CANCELLED',
    className: 'border-slate-300 bg-slate-100 text-slate-600',
  },
  PLANNED: {
    label: 'PLANNED',
    className: 'border-indigo-200 bg-indigo-50 text-indigo-700',
  },
}

const timelineMeta: Record<string, { icon: string; iconClass: string }> = {
  JOURNEY_CREATED: { icon: '🧭', iconClass: 'bg-indigo-100 text-indigo-700' },
  JOURNEY_STARTED: { icon: '▶', iconClass: 'bg-blue-100 text-blue-700' },
  LOCATION_RECORDED: { icon: '📍', iconClass: 'bg-slate-100 text-slate-700' },
  DEVIATION_DETECTED: { icon: '⚠', iconClass: 'bg-amber-100 text-amber-700' },
  CHECK_IN_REQUIRED: { icon: '🛡', iconClass: 'bg-amber-100 text-amber-700' },
  SAFETY_CONFIRMED: { icon: '✅', iconClass: 'bg-emerald-100 text-emerald-700' },
  GUARDIAN_RESPONSE_SENT: { icon: '💬', iconClass: 'bg-fuchsia-100 text-fuchsia-700' },
  ESCALATED_TO_SOS: { icon: '🚨', iconClass: 'bg-red-100 text-red-700' },
  JOURNEY_COMPLETED: { icon: '🏁', iconClass: 'bg-emerald-100 text-emerald-700' },
  JOURNEY_CANCELLED: { icon: '⛔', iconClass: 'bg-slate-100 text-slate-700' },
}

const StatusBadge = ({ status }: { status: JourneyStatus }) => {
  const style = statusStyle[status]
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold ${style.className}`}>
      {style.label}
    </span>
  )
}

const Card = ({ title, children, actions }: { title: string; children: React.ReactNode; actions?: React.ReactNode }) => (
  <section className="rounded-xl border border-brand-border bg-brand-dark p-4 shadow-sm md:p-5">
    <div className="flex items-center justify-between gap-2">
      <h3 className="text-base font-semibold text-brand-text md:text-lg">{title}</h3>
      {actions}
    </div>
    <div className="mt-3">{children}</div>
  </section>
)

const DestinationMapSync = ({ latitude, longitude }: { latitude: number; longitude: number }) => {
  const map = useMap()
  useEffect(() => {
    map.setView([latitude, longitude], Math.max(14, map.getZoom()))
  }, [latitude, longitude, map])
  return null
}

const DestinationMapClick = ({ onMapClick }: { onMapClick: (event: LeafletMouseEvent) => void }) => {
  useMapEvents({
    click: onMapClick,
  })
  return null
}

const toTimelineItems = (events: JourneyEvent[]) => {
  const items: TimelineItem[] = []
  let locationBuffer: JourneyEvent[] = []

  const flushLocationBuffer = () => {
    if (!locationBuffer.length) return
    if (locationBuffer.length === 1) {
      const event = locationBuffer[0]
      const meta = timelineMeta[event.eventType] ?? { icon: '•', iconClass: 'bg-slate-100 text-slate-700' }
      items.push({
        id: `event-${event.id}`,
        eventType: event.eventType,
        message: event.message,
        createdAt: event.createdAt,
        icon: meta.icon,
        iconClass: meta.iconClass,
      })
    } else {
      const latest = locationBuffer[0]
      const earliest = locationBuffer[locationBuffer.length - 1]
      items.push({
        id: `location-group-${latest.id}-${earliest.id}`,
        eventType: 'LOCATION_RECORDED',
        message: `${locationBuffer.length} location updates recorded`,
        createdAt: latest.createdAt,
        icon: '📍',
        iconClass: 'bg-slate-100 text-slate-700',
      })
    }
    locationBuffer = []
  }

  for (const event of events) {
    if (event.eventType === 'LOCATION_RECORDED') {
      locationBuffer.push(event)
      continue
    }
    flushLocationBuffer()
    const meta = timelineMeta[event.eventType] ?? { icon: '•', iconClass: 'bg-slate-100 text-slate-700' }
    items.push({
      id: `event-${event.id}`,
      eventType: event.eventType,
      message: event.message,
      createdAt: event.createdAt,
      icon: meta.icon,
      iconClass: meta.iconClass,
    })
  }
  flushLocationBuffer()
  return items
}

export const UserSafeJourney = () => {
  const { token } = useAuth()
  const [journeys, setJourneys] = useState<Journey[]>([])
  const [selectedJourneyId, setSelectedJourneyId] = useState<number | null>(null)
  const [preview, setPreview] = useState<JourneyRoutePreview | null>(null)
  const [previewOrigin, setPreviewOrigin] = useState<{ latitude: number; longitude: number } | null>(null)
  const [journeyTitle, setJourneyTitle] = useState('Safe Journey')
  const [destinationQuery, setDestinationQuery] = useState('')
  const [destinationSuggestions, setDestinationSuggestions] = useState<JourneyDestinationSuggestion[]>([])
  const [suggestionsLoading, setSuggestionsLoading] = useState(false)
  const [suggestionsError, setSuggestionsError] = useState('')
  const [showSuggestionList, setShowSuggestionList] = useState(false)
  const [destinationDraft, setDestinationDraft] = useState<DestinationDraft | null>(null)
  const [confirmedDestination, setConfirmedDestination] = useState<DestinationDraft | null>(null)
  const [resolvingAddress, setResolvingAddress] = useState(false)
  const [mapEditorOpen, setMapEditorOpen] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [tracking, setTracking] = useState(false)
  const [timelineExpanded, setTimelineExpanded] = useState(false)
  const [confirmDialog, setConfirmDialog] = useState<JourneyConfirmDialog>(null)
  const watchIdRef = useRef<number | null>(null)
  const sendingLocationRef = useRef(false)
  const activeJourneyRef = useRef<Journey | null>(null)
  const searchSequenceRef = useRef(0)
  const reverseSequenceRef = useRef(0)
  const debounceTimerRef = useRef<number | null>(null)

  const selectedJourney = useMemo(
    () => journeys.find((item) => item.id === selectedJourneyId) ?? null,
    [journeys, selectedJourneyId],
  )
  const activeJourney = useMemo(() => journeys.find((item) => isJourneyLive(item.status)) ?? null, [journeys])

  useEffect(() => {
    activeJourneyRef.current = activeJourney ?? null
  }, [activeJourney])

  const stopTracking = useCallback(() => {
    if (watchIdRef.current !== null && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchIdRef.current)
    }
    watchIdRef.current = null
    setTracking(false)
  }, [])

  const refreshJourneys = useCallback(async () => {
    if (!token) return
    const data = await journeyApi.list(token)
    setJourneys(data.journeys)
    const latest = data.journeys[0]?.id ?? null
    setSelectedJourneyId((previous) => previous ?? latest)
  }, [token])

  useEffect(() => {
    const run = async () => {
      if (!token) return
      try {
        await refreshJourneys()
      } catch (apiError) {
        setError(getApiMessage(apiError, 'Could not load safe journeys.'))
      }
    }
    void run()
  }, [token, refreshJourneys])

  const sendLocationUpdate = useCallback(
    async (position: PositionSnapshot) => {
      if (!token || sendingLocationRef.current) return
      const currentJourney = activeJourneyRef.current
      if (!currentJourney) return

      sendingLocationRef.current = true
      try {
        const response = await journeyApi.addLocation(token, currentJourney.id, {
          latitude: position.latitude,
          longitude: position.longitude,
          accuracy: position.accuracy ?? undefined,
          locationTimestamp: position.locationTimestamp,
        })
        setJourneys((previous) =>
          previous.map((item) => (item.id === response.journey.id ? response.journey : item)),
        )
      } catch (apiError) {
        setError(getApiMessage(apiError, 'Unable to update journey location.'))
      } finally {
        sendingLocationRef.current = false
      }
    },
    [token],
  )

  const startTracking = useCallback(() => {
    if (watchIdRef.current !== null || !navigator.geolocation) return
    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const snapshot: PositionSnapshot = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: Number.isFinite(position.coords.accuracy) ? position.coords.accuracy : null,
          locationTimestamp: new Date(position.timestamp).toISOString(),
        }
        void sendLocationUpdate(snapshot)
      },
      () => {
        setError('Location permission or access failed. Journey monitoring will use last known location.')
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 5000 },
    )
    watchIdRef.current = watchId
    setTracking(true)
  }, [sendLocationUpdate])

  useEffect(() => {
    if (!activeJourney) return undefined
    startTracking()
    return () => {
      stopTracking()
    }
  }, [activeJourney, startTracking, stopTracking])

  useEffect(() => () => stopTracking(), [stopTracking])

  useEffect(() => {
    if (!token) return
    const socket = createRealtimeSocket(token)

    const onJourneyUpdate = (payload: JourneyRealtimePayload) => {
      setJourneys((previous) => {
        const next = [payload.journey, ...previous.filter((journey) => journey.id !== payload.journey.id)]
        return next.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      })
      setSelectedJourneyId((previous) => previous ?? payload.journey.id)
    }

    const onGuardianResponse = (payload: JourneyGuardianResponseRealtimePayload) => {
      setJourneys((previous) =>
        previous.map((journey) => {
          if (journey.id !== payload.journeyId) return journey
          const exists = journey.guardianResponses.some((item) => item.id === payload.response.id)
          if (exists) return journey
          return {
            ...journey,
            guardianResponses: [payload.response, ...journey.guardianResponses].slice(0, 100),
          }
        }),
      )
      setMessage('A guardian has sent a response update for your journey.')
    }

    socket.on('journey:created', onJourneyUpdate)
    socket.on('journey:updated', onJourneyUpdate)
    socket.on('journey:guardian-response', onGuardianResponse)

    return () => {
      socket.off('journey:created', onJourneyUpdate)
      socket.off('journey:updated', onJourneyUpdate)
      socket.off('journey:guardian-response', onGuardianResponse)
      socket.disconnect()
    }
  }, [token])

  useEffect(() => {
    if (!token) return
    if (debounceTimerRef.current) {
      window.clearTimeout(debounceTimerRef.current)
      debounceTimerRef.current = null
    }

    const query = destinationQuery.trim()
    if (query.length < 3) return

    debounceTimerRef.current = window.setTimeout(() => {
      const sequence = ++searchSequenceRef.current
      setSuggestionsLoading(true)
      setSuggestionsError('')
      journeyApi
        .searchDestinations(token, query)
        .then((result) => {
          if (sequence !== searchSequenceRef.current) return
          setDestinationSuggestions(result.suggestions)
        })
        .catch((apiError) => {
          if (sequence !== searchSequenceRef.current) return
          setSuggestionsError(getApiMessage(apiError, 'Unable to fetch destination suggestions.'))
          setDestinationSuggestions([])
        })
        .finally(() => {
          if (sequence === searchSequenceRef.current) {
            setSuggestionsLoading(false)
          }
        })
    }, 450)

    return () => {
      if (debounceTimerRef.current) {
        window.clearTimeout(debounceTimerRef.current)
        debounceTimerRef.current = null
      }
    }
  }, [destinationQuery, token])

  const invalidatePreview = () => {
    setPreview(null)
    setPreviewOrigin(null)
  }

  const onSelectSuggestion = (suggestion: JourneyDestinationSuggestion) => {
    setDestinationQuery(suggestion.displayName)
    setDestinationDraft({
      address: suggestion.displayName,
      latitude: suggestion.latitude,
      longitude: suggestion.longitude,
    })
    setMapEditorOpen(true)
    setShowSuggestionList(false)
    invalidatePreview()
  }

  const resolveDestinationAddress = useCallback(
    async (latitude: number, longitude: number) => {
      if (!token) return
      const sequence = ++reverseSequenceRef.current
      setResolvingAddress(true)
      try {
        const result = await journeyApi.reverseDestination(token, latitude, longitude)
        if (sequence !== reverseSequenceRef.current) return
        setDestinationDraft({
          latitude: result.destination.latitude,
          longitude: result.destination.longitude,
          address: result.destination.displayName ?? `${result.destination.latitude}, ${result.destination.longitude}`,
        })
        invalidatePreview()
      } catch (apiError) {
        if (sequence !== reverseSequenceRef.current) return
        setError(getApiMessage(apiError, 'Unable to resolve destination address for selected point.'))
      } finally {
        if (sequence === reverseSequenceRef.current) {
          setResolvingAddress(false)
        }
      }
    },
    [token],
  )

  const onMapLocationChanged = (latitude: number, longitude: number) => {
    void resolveDestinationAddress(latitude, longitude)
  }

  const previewRoute = async () => {
    if (!token) return
    if (!confirmedDestination) {
      setError('Please confirm destination before previewing the route.')
      return
    }

    setError('')
    setMessage('')

    try {
      setLoading(true)
      const current = await readCurrentPosition()
      const data = await journeyApi.preview(token, {
        originLatitude: current.latitude,
        originLongitude: current.longitude,
        destinationLatitude: confirmedDestination.latitude,
        destinationLongitude: confirmedDestination.longitude,
        destinationName: confirmedDestination.address,
      })
      setPreview(data.route)
      setPreviewOrigin({ latitude: current.latitude, longitude: current.longitude })
      setMessage('Route preview ready. Review and start journey when ready.')
    } catch (apiError) {
      setError(getApiMessage(apiError, 'Unable to preview route.'))
    } finally {
      setLoading(false)
    }
  }

  const startJourney = async () => {
    if (!token) return
    if (!confirmedDestination) {
      setError('Please confirm destination before starting journey.')
      return
    }
    setError('')
    setMessage('')
    try {
      setLoading(true)
      const current = await readCurrentPosition()
      const data = await journeyApi.start(token, {
        title: journeyTitle.trim() || undefined,
        originLatitude: current.latitude,
        originLongitude: current.longitude,
        destinationLatitude: confirmedDestination.latitude,
        destinationLongitude: confirmedDestination.longitude,
        destinationName: confirmedDestination.address,
        accuracy: current.accuracy ?? undefined,
        locationTimestamp: current.locationTimestamp,
      })
      setJourneys((previous) => [data.journey, ...previous.filter((item) => item.id !== data.journey.id)])
      setSelectedJourneyId(data.journey.id)
      setMessage('Safe journey started and shared with guardians.')
      invalidatePreview()
      setDestinationDraft(null)
      setConfirmedDestination(null)
      setDestinationQuery('')
      setMapEditorOpen(false)
    } catch (apiError) {
      setError(getApiMessage(apiError, 'Could not start safe journey.'))
    } finally {
      setLoading(false)
    }
  }

  const confirmSafety = async (journeyId: number) => {
    if (!token) return
    try {
      setLoading(true)
      const response = await journeyApi.confirmSafety(token, journeyId)
      setJourneys((previous) => previous.map((item) => (item.id === response.journey.id ? response.journey : item)))
      setMessage('Safety confirmed. Journey monitoring resumed.')
    } catch (apiError) {
      setError(getApiMessage(apiError, 'Could not confirm safety.'))
    } finally {
      setLoading(false)
    }
  }

  const completeJourney = async (journeyId: number) => {
    if (!token) return

    try {
      setLoading(true)
      const response = await journeyApi.complete(token, journeyId)
      setJourneys((previous) => previous.map((item) => (item.id === response.journey.id ? response.journey : item)))
      setMessage('Journey marked as completed.')
    } catch (apiError) {
      setError(getApiMessage(apiError, 'Could not complete journey.'))
    } finally {
      setLoading(false)
    }
  }

  const cancelJourney = async (journeyId: number) => {
    if (!token) return

    try {
      setLoading(true)
      const response = await journeyApi.cancel(token, journeyId)
      setJourneys((previous) => previous.map((item) => (item.id === response.journey.id ? response.journey : item)))
      setMessage('Journey cancelled.')
    } catch (apiError) {
      setError(getApiMessage(apiError, 'Could not cancel journey.'))
    } finally {
      setLoading(false)
    }
  }

  const openCompleteDialog = (journeyId: number) => {
    setConfirmDialog({ action: 'complete', journeyId })
  }

  const openCancelDialog = (journeyId: number) => {
    setConfirmDialog({ action: 'cancel', journeyId })
  }

  const handleDialogConfirm = async () => {
    if (!confirmDialog) return
    if (confirmDialog.action === 'complete') {
      await completeJourney(confirmDialog.journeyId)
    } else {
      await cancelJourney(confirmDialog.journeyId)
    }
    setConfirmDialog(null)
  }

  const selectedRoutePoints = useMemo(() => {
    if (!selectedJourney?.routePolyline) return []
    return decodePolyline(selectedJourney.routePolyline)
  }, [selectedJourney])

  const previewRoutePoints = useMemo(() => {
    if (!preview?.encodedPolyline) return []
    return decodePolyline(preview.encodedPolyline)
  }, [preview])

  const isLocationStale = !selectedJourney?.currentLocationAt
    ? true
    : (new Date(selectedJourney.updatedAt).getTime() - new Date(selectedJourney.currentLocationAt).getTime()) / (1000 * 60) > 8

  const timelineItems = useMemo(() => toTimelineItems(selectedJourney?.events ?? []), [selectedJourney])
  const visibleTimelineItems = useMemo(
    () => (timelineExpanded ? timelineItems : timelineItems.slice(0, 12)),
    [timelineExpanded, timelineItems],
  )

  const escalationBanner = useMemo(() => {
    if (!selectedJourney) return null
    if (!['CHECK_IN_REQUIRED', 'ESCALATED'].includes(selectedJourney.status)) return null
    const toneClass =
      selectedJourney.status === 'ESCALATED'
        ? 'border-red-300 bg-red-50 text-red-700'
        : 'border-amber-300 bg-amber-50 text-amber-700'
    return {
      toneClass,
      title: selectedJourney.status === 'ESCALATED' ? 'SOS Escalation Active' : 'Safety Check-in Required',
      reason:
        selectedJourney.checkInReason ||
        (selectedJourney.status === 'ESCALATED'
          ? 'Check-in timed out and the journey was escalated to SOS.'
          : 'Please confirm safety to prevent automatic escalation.'),
    }
  }, [selectedJourney])

  const planningLocked = Boolean(activeJourney)

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-brand-border bg-brand-dark p-4 shadow-sm md:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-2xl font-semibold text-brand-text">Safe Journey Mode</h2>
            <p className="mt-1 text-sm text-brand-muted">
              Plan, monitor, and respond to live journey safety events with guardian support.
            </p>
          </div>
          <div className="rounded-lg border border-brand-border bg-brand-black-soft px-3 py-2 text-sm">
            <p className="text-xs text-brand-muted">Current journey status</p>
            {selectedJourney ? <StatusBadge status={selectedJourney.status} /> : <p className="mt-1 text-brand-muted">No journey selected</p>}
          </div>
        </div>
      </section>

      {error ? <InlineAlert message={error} /> : null}
      {message ? (
        <p className="rounded-lg border border-brand-border bg-brand-pink-light px-3 py-2 text-sm text-brand-pink">{message}</p>
      ) : null}

      {escalationBanner && selectedJourney ? (
        <section className={`rounded-xl border p-4 ${escalationBanner.toneClass}`}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold">{escalationBanner.title}</p>
              <p className="mt-1 text-sm">{escalationBanner.reason}</p>
              <p className="mt-1 text-xs">
                {selectedJourney.status === 'CHECK_IN_REQUIRED'
                  ? `Respond before ${formatDateTime(selectedJourney.checkInExpiresAt)}`
                  : `Escalated at ${formatDateTime(selectedJourney.escalatedAt)}`}
              </p>
              {selectedJourney.escalationIncidentId ? (
                <p className="mt-1 text-xs">
                  Linked SOS incident: #{selectedJourney.escalationIncidentId} ({selectedJourney.escalationIncident?.status ?? 'ACTIVE'})
                </p>
              ) : null}
            </div>
            {selectedJourney.status === 'CHECK_IN_REQUIRED' ? (
              <button
                className="rounded-md bg-brand-pink px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
                disabled={loading}
                onClick={() => void confirmSafety(selectedJourney.id)}
                type="button"
              >
                I am Safe
              </button>
            ) : null}
          </div>
        </section>
      ) : null}

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
        <article className={`rounded-xl border border-brand-border bg-brand-dark p-4 shadow-sm md:p-5 ${planningLocked ? 'opacity-85' : ''}`}>
          <div className="flex items-center justify-between gap-2">
            <p className="text-base font-semibold text-brand-text md:text-lg">Plan New Journey</p>
            {planningLocked ? <StatusBadge status={activeJourney?.status ?? 'ACTIVE'} /> : null}
          </div>
          {planningLocked ? (
            <p className="mt-1 text-xs text-brand-muted">
              Journey planning is paused while an active journey is in progress. Complete or cancel it first.
            </p>
          ) : null}

          <div className="mt-3 grid gap-3">
            <FormField id="journeyTitle" label="Journey title">
              <TextInput
                disabled={planningLocked}
                id="journeyTitle"
                onChange={(event) => setJourneyTitle(event.target.value)}
                placeholder="Safe Journey"
                value={journeyTitle}
              />
            </FormField>

            <FormField id="destinationSearch" label="Search destination">
              <div className="relative">
                <TextInput
                  disabled={planningLocked}
                  id="destinationSearch"
                  onChange={(event) => {
                    const value = event.target.value
                    setDestinationQuery(value)
                    setShowSuggestionList(true)
                    setConfirmedDestination(null)
                    setDestinationDraft(null)
                    setMapEditorOpen(false)
                    invalidatePreview()
                    if (value.trim().length < 3) {
                      setDestinationSuggestions([])
                      setSuggestionsError('')
                    }
                  }}
                  onFocus={() => setShowSuggestionList(true)}
                  placeholder="Search address, area, or landmark"
                  value={destinationQuery}
                />
                {showSuggestionList && destinationQuery.trim().length >= 3 && !planningLocked ? (
                  <div className="absolute z-[1000] mt-1 max-h-64 w-full overflow-auto rounded-md border border-brand-border bg-white shadow-lg">
                    {suggestionsLoading ? (
                      <p className="px-3 py-2 text-sm text-brand-muted">Searching destinations...</p>
                    ) : suggestionsError ? (
                      <p className="px-3 py-2 text-sm text-brand-pink">{suggestionsError}</p>
                    ) : destinationSuggestions.length ? (
                      destinationSuggestions.map((suggestion) => (
                        <button
                          className="block w-full border-b border-brand-border px-3 py-2 text-left text-sm text-brand-text hover:bg-brand-pink-light"
                          key={suggestion.placeId}
                          onClick={() => onSelectSuggestion(suggestion)}
                          type="button"
                        >
                          {suggestion.displayName}
                        </button>
                      ))
                    ) : (
                      <p className="px-3 py-2 text-sm text-brand-muted">No matching places found.</p>
                    )}
                  </div>
                ) : null}
              </div>
            </FormField>

            {mapEditorOpen && destinationDraft ? (
              <div className="space-y-2 rounded-lg border border-brand-border bg-brand-black-soft p-3">
                <p className="text-sm font-semibold text-brand-text">Adjust destination on map</p>
                <p className="text-xs text-brand-muted">Click anywhere or drag marker, then confirm destination.</p>
                <div className="h-60 overflow-hidden rounded-md border border-brand-border">
                  <MapContainer center={[destinationDraft.latitude, destinationDraft.longitude]} style={{ height: '100%', width: '100%' }} zoom={15}>
                    <TileLayer
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <DestinationMapSync latitude={destinationDraft.latitude} longitude={destinationDraft.longitude} />
                    <DestinationMapClick onMapClick={(event) => onMapLocationChanged(event.latlng.lat, event.latlng.lng)} />
                    <Marker
                      draggable
                      eventHandlers={{
                        dragend: (event) => {
                          const target = event.target
                          const position = target.getLatLng()
                          onMapLocationChanged(position.lat, position.lng)
                        },
                      }}
                      icon={getLocationPinIcon('var(--color-brand-pink)', 32)}
                      position={[destinationDraft.latitude, destinationDraft.longitude]}
                    />
                  </MapContainer>
                </div>
                <p className="text-xs text-brand-muted">
                  {resolvingAddress
                    ? 'Resolving selected location...'
                    : `Selected: ${destinationDraft.address} (${destinationDraft.latitude.toFixed(5)}, ${destinationDraft.longitude.toFixed(5)})`}
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    className="rounded-md border border-brand-border px-3 py-1.5 text-xs font-semibold text-brand-text hover:bg-brand-dark"
                    onClick={() => {
                      setMapEditorOpen(false)
                      setDestinationDraft(null)
                      setConfirmedDestination(null)
                      invalidatePreview()
                    }}
                    type="button"
                  >
                    Change Location
                  </button>
                  <button
                    className="rounded-md bg-brand-pink px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-70"
                    disabled={resolvingAddress}
                    onClick={() => {
                      if (!destinationDraft) return
                      setConfirmedDestination(destinationDraft)
                      setDestinationQuery(destinationDraft.address)
                      setMapEditorOpen(false)
                      invalidatePreview()
                      setMessage('Destination confirmed. You can preview and start journey.')
                    }}
                    type="button"
                  >
                    Confirm Destination
                  </button>
                </div>
              </div>
            ) : null}

            {confirmedDestination ? (
              <div className="rounded-lg border border-brand-border bg-brand-black-soft p-3 text-sm text-brand-muted">
                <p className="font-semibold text-brand-text">Confirmed destination</p>
                <p className="mt-0.5">{confirmedDestination.address}</p>
                <button
                  className="mt-2 rounded-md border border-brand-border px-3 py-1.5 text-xs font-semibold text-brand-text hover:bg-brand-dark"
                  onClick={() => {
                    setConfirmedDestination(null)
                    setDestinationDraft(null)
                    setMapEditorOpen(false)
                    setShowSuggestionList(true)
                    invalidatePreview()
                  }}
                  type="button"
                >
                  Change Location
                </button>
              </div>
            ) : null}

            <div className="flex flex-wrap gap-2">
              <button
                className="rounded-md border border-brand-border px-3 py-2 text-sm font-semibold text-brand-text hover:bg-brand-black-soft disabled:opacity-70"
                disabled={loading || !confirmedDestination || planningLocked}
                onClick={() => void previewRoute()}
                type="button"
              >
                Preview Route
              </button>
              <button
                className="rounded-md bg-brand-pink px-3 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70"
                disabled={loading || !preview || !confirmedDestination || planningLocked}
                onClick={() => void startJourney()}
                type="button"
              >
                Start Journey
              </button>
            </div>

            {preview ? (
              <div className="rounded-lg border border-brand-border bg-brand-black-soft p-3 text-sm text-brand-muted">
                <p className="font-semibold text-brand-text">Route preview ready</p>
                <p className="mt-0.5">Destination: {preview.destinationName}</p>
                <div className="mt-1 grid grid-cols-2 gap-2">
                  <p>
                    Distance: <span className="text-brand-text">{distanceText(preview.distanceMeters)}</span>
                  </p>
                  <p>
                    ETA: <span className="text-brand-text">{preview.walkingDurationText ?? 'N/A'}</span>
                  </p>
                </div>
                <a
                  className="mt-2 inline-block text-xs font-semibold text-brand-pink underline"
                  href={preview.navigateUrl}
                  rel="noreferrer"
                  target="_blank"
                >
                  Open external OpenStreetMap navigation
                </a>
              </div>
            ) : null}
          </div>
        </article>

        <Card title="Active Journey">
          {selectedJourney ? (
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between gap-2">
                <p className="font-semibold text-brand-text">{selectedJourney.title}</p>
                <StatusBadge status={selectedJourney.status} />
              </div>
              <dl className="grid gap-2 text-brand-muted">
                <div className="rounded-lg border border-brand-border bg-brand-black-soft px-3 py-2">
                  <dt className="text-xs text-brand-muted">Destination</dt>
                  <dd className="text-sm text-brand-text">{selectedJourney.destinationName}</dd>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <div className="rounded-lg border border-brand-border bg-brand-black-soft px-3 py-2">
                    <dt className="text-xs text-brand-muted">Expected arrival</dt>
                    <dd className="text-sm text-brand-text">{formatDateTime(selectedJourney.expectedArrivalAt)}</dd>
                  </div>
                  <div className="rounded-lg border border-brand-border bg-brand-black-soft px-3 py-2">
                    <dt className="text-xs text-brand-muted">Tracking status</dt>
                    <dd className="text-sm text-brand-text">
                      {tracking && isJourneyLive(selectedJourney.status) ? 'Live tracking on' : 'Tracking paused'}
                    </dd>
                  </div>
                </div>
                <div className="rounded-lg border border-brand-border bg-brand-black-soft px-3 py-2">
                  <dt className="text-xs text-brand-muted">Last known location</dt>
                  <dd className="text-sm text-brand-text">{selectedJourney.currentAddress ?? 'Unavailable'}</dd>
                  <p className={`mt-1 text-xs ${isLocationStale ? 'text-amber-700' : 'text-brand-muted'}`}>
                    Updated {formatDateTime(selectedJourney.currentLocationAt)} {isLocationStale ? '(may be stale)' : ''}
                  </p>
                </div>
              </dl>
              {selectedJourney.lastEscalationNotificationError ? (
                <p className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-xs text-red-700">
                  Notification issue: {selectedJourney.lastEscalationNotificationError}
                </p>
              ) : null}
              {isJourneyLive(selectedJourney.status) ? (
                <div className="flex flex-wrap gap-2 pt-1">
                  <button
                    className="rounded-md border border-brand-border px-3 py-2 text-xs font-semibold text-brand-text hover:bg-brand-black-soft"
                    disabled={loading}
                    onClick={() => openCancelDialog(selectedJourney.id)}
                    type="button"
                  >
                    Cancel Journey
                  </button>
                  <button
                    className="rounded-md bg-brand-pink px-3 py-2 text-xs font-semibold text-white hover:opacity-90"
                    disabled={loading}
                    onClick={() => openCompleteDialog(selectedJourney.id)}
                    type="button"
                  >
                    Complete Journey
                  </button>
                  {selectedJourney.status === 'CHECK_IN_REQUIRED' ? (
                    <button
                      className="rounded-md bg-amber-500 px-3 py-2 text-xs font-semibold text-white hover:opacity-90"
                      disabled={loading}
                      onClick={() => void confirmSafety(selectedJourney.id)}
                      type="button"
                    >
                      Confirm Safety
                    </button>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : (
            <p className="text-sm text-brand-muted">No journey selected yet. Choose one from Recent Journeys.</p>
          )}
        </Card>
      </section>

      <Card title="Journey Map">
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2 text-xs text-brand-muted">
            <span className="rounded-full border border-brand-border bg-brand-black-soft px-2 py-1">📍 Current/last known</span>
            <span className="rounded-full border border-brand-border bg-brand-black-soft px-2 py-1">🎯 Destination</span>
            <span className="rounded-full border border-brand-border bg-brand-black-soft px-2 py-1">🛣 Route</span>
          </div>

          {previewOrigin && confirmedDestination ? (
            <div className="h-[22rem] overflow-hidden rounded-lg border border-brand-border">
              <MapContainer center={[previewOrigin.latitude, previewOrigin.longitude]} style={{ height: '100%', width: '100%' }} zoom={13}>
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <Marker icon={getLocationPinIcon('var(--color-brand-text)', 30)} position={[previewOrigin.latitude, previewOrigin.longitude]} />
                <Marker icon={getLocationPinIcon('var(--color-brand-pink)', 30)} position={[confirmedDestination.latitude, confirmedDestination.longitude]} />
                {previewRoutePoints.length > 1 ? <Polyline color="var(--color-brand-pink)" positions={previewRoutePoints} /> : null}
              </MapContainer>
            </div>
          ) : selectedJourney && selectedJourney.currentLatitude !== null && selectedJourney.currentLongitude !== null ? (
            <div className="h-[22rem] overflow-hidden rounded-lg border border-brand-border">
              <MapContainer center={[selectedJourney.currentLatitude, selectedJourney.currentLongitude]} style={{ height: '100%', width: '100%' }} zoom={13}>
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <Marker icon={getLocationPinIcon('var(--color-brand-text)', 30)} position={[selectedJourney.currentLatitude, selectedJourney.currentLongitude]} />
                <Marker icon={getLocationPinIcon('var(--color-brand-pink)', 30)} position={[selectedJourney.destinationLatitude, selectedJourney.destinationLongitude]} />
                {selectedRoutePoints.length > 1 ? <Polyline color="var(--color-brand-pink)" positions={selectedRoutePoints} /> : null}
              </MapContainer>
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-brand-border bg-brand-black-soft px-4 py-10 text-center text-sm text-brand-muted">
              Location data is unavailable right now. Start or select a journey with location updates to render the map.
            </div>
          )}
        </div>
      </Card>

      <Card
        title="Recent Journeys"
        actions={
          <button
            className="rounded-md border border-brand-border px-3 py-1.5 text-xs font-medium text-brand-text hover:bg-brand-black-soft"
            onClick={() => void refreshJourneys()}
            type="button"
          >
            Refresh
          </button>
        }
      >
        {!journeys.length ? (
          <p className="text-sm text-brand-muted">No journeys created yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-brand-muted">
                <tr>
                  <th className="pb-2">Journey</th>
                  <th className="pb-2">Destination</th>
                  <th className="pb-2">Status</th>
                  <th className="pb-2">Started</th>
                  <th className="pb-2">Completed</th>
                  <th className="pb-2 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {journeys.slice(0, 12).map((journey) => (
                  <tr
                    className={`border-t ${journey.status === 'ESCALATED' ? 'border-red-200 bg-red-50/40' : 'border-brand-border'}`}
                    key={journey.id}
                  >
                    <td className="py-2">
                      <p className="font-medium text-brand-text">{journey.title}</p>
                      <p className="text-xs text-brand-muted">#{journey.id}</p>
                    </td>
                    <td className="py-2 text-brand-text" title={journey.destinationName}>
                      {truncateText(journey.destinationName, 72)}
                    </td>
                    <td className="py-2">
                      <StatusBadge status={journey.status} />
                    </td>
                    <td className="py-2 text-brand-text">{formatDateTime(journey.startedAt)}</td>
                    <td className="py-2 text-brand-text">{formatDateTime(journey.completedAt ?? journey.cancelledAt)}</td>
                    <td className="py-2 text-right">
                      <button
                        className="rounded-md border border-brand-border px-2.5 py-1 text-xs font-medium text-brand-text hover:bg-brand-black-soft"
                        onClick={() => setSelectedJourneyId(journey.id)}
                        type="button"
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card title="Guardian Responses">
        {!selectedJourney ? (
          <p className="text-sm text-brand-muted">Select a journey to view guardian communication.</p>
        ) : !selectedJourney.guardianResponses.length ? (
          <p className="rounded-lg border border-dashed border-brand-border bg-brand-black-soft px-3 py-6 text-center text-sm text-brand-muted">
            No guardian responses yet for this journey.
          </p>
        ) : (
          <ul className="space-y-2">
            {selectedJourney.guardianResponses.map((response) => (
              <li className="rounded-lg border border-brand-border bg-brand-black-soft px-3 py-2.5" key={response.id}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-brand-text">{response.guardian.name}</p>
                  <p className="text-xs text-brand-muted">{new Date(response.createdAt).toLocaleString()}</p>
                </div>
                <p className="mt-1 text-sm text-brand-text">{response.message}</p>
                <div className="mt-1 flex flex-wrap gap-2 text-[11px]">
                  {response.messageTemplateKey ? (
                    <span className="rounded-full border border-brand-border bg-white px-2 py-0.5 text-brand-muted">
                      Template: {response.messageTemplateKey}
                    </span>
                  ) : null}
                  <span
                    className={`rounded-full border px-2 py-0.5 ${
                      response.deliveredViaRealtime
                        ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                        : 'border-amber-300 bg-amber-50 text-amber-700'
                    }`}
                  >
                    {response.deliveredViaRealtime ? 'Delivered realtime' : 'Stored (delivery pending)'}
                  </span>
                  {response.deliveryError ? (
                    <span className="rounded-full border border-red-300 bg-red-50 px-2 py-0.5 text-red-700">
                      Delivery issue logged
                    </span>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card title="Journey Event Timeline">
        {!selectedJourney ? (
          <p className="text-sm text-brand-muted">Select a journey to inspect its safety timeline.</p>
        ) : !timelineItems.length ? (
          <p className="text-sm text-brand-muted">No events recorded.</p>
        ) : (
          <>
            <ol className="relative ml-2 border-l border-brand-border pl-4">
              {visibleTimelineItems.map((item) => (
                <li className="mb-3 last:mb-0" key={item.id}>
                  <span
                    className={`absolute -left-[13px] mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full border border-white text-xs ${item.iconClass}`}
                    aria-hidden="true"
                  >
                    {item.icon}
                  </span>
                  <div className="rounded-lg border border-brand-border bg-brand-black-soft px-3 py-2">
                    <p className="text-sm font-medium text-brand-text">{item.message}</p>
                    <p className="mt-0.5 text-xs text-brand-muted">
                      {new Date(item.createdAt).toLocaleString()} • {item.eventType}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
            {timelineItems.length > 12 ? (
              <button
                className="mt-3 rounded-md border border-brand-border px-3 py-1.5 text-xs font-medium text-brand-text hover:bg-brand-black-soft"
                onClick={() => setTimelineExpanded((previous) => !previous)}
                type="button"
              >
                {timelineExpanded ? 'Collapse Timeline' : `View All (${timelineItems.length})`}
              </button>
            ) : null}
          </>
        )}
      </Card>

      {confirmDialog ? (
        <div
          aria-modal="true"
          className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/45 p-4"
          role="dialog"
        >
          <div className="w-full max-w-md rounded-xl border border-brand-border bg-white p-5 shadow-xl">
            <h4 className="text-lg font-semibold text-brand-text">
              {confirmDialog.action === 'complete' ? 'Complete safe journey?' : 'Cancel safe journey?'}
            </h4>
            <p className="mt-2 text-sm text-brand-muted">
              {confirmDialog.action === 'complete'
                ? 'This journey will be marked as completed.'
                : 'This journey will be cancelled and monitoring will stop.'}
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                className="rounded-md border border-brand-border px-3 py-2 text-sm font-medium text-brand-text hover:bg-brand-black-soft"
                disabled={loading}
                onClick={() => setConfirmDialog(null)}
                type="button"
              >
                Keep as is
              </button>
              <button
                className={`rounded-md px-3 py-2 text-sm font-semibold text-white ${
                  confirmDialog.action === 'complete' ? 'bg-brand-pink' : 'bg-red-600'
                } hover:opacity-90 disabled:opacity-70`}
                disabled={loading}
                onClick={() => void handleDialogConfirm()}
                type="button"
              >
                {loading ? 'Please wait...' : confirmDialog.action === 'complete' ? 'Yes, complete' : 'Yes, cancel'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
