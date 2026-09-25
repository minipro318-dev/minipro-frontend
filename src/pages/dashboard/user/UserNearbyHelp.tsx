import { useEffect, useMemo, useState } from 'react'
import 'leaflet/dist/leaflet.css'
import { MapContainer, Marker, Polyline, TileLayer, useMap } from 'react-leaflet'
import { InlineAlert } from '../../../components/ui'
import { getLocationPinIcon } from '../../../components/maps/map-marker-icons'
import { useAuth } from '../../../hooks/useAuth'
import { nearbyHelpApi } from '../../../services/nearby-help.api'
import type { NearbyHelpPlace, NearbyHelpRoute } from '../../../types/nearby-help.types'

type CurrentLocation = {
  latitude: number
  longitude: number
}

const MapFocusOnSelection = ({ latitude, longitude }: { latitude: number; longitude: number }) => {
  const map = useMap()

  useEffect(() => {
    map.flyTo([latitude, longitude], Math.max(map.getZoom(), 14), { animate: true, duration: 0.6 })
  }, [latitude, longitude, map])

  return null
}

const getLocationErrorMessage = (error: unknown) => {
  if (error && typeof error === 'object' && 'code' in error) {
    const code = (error as { code?: number }).code
    if (code === 1) return 'Location permission denied. Please allow location access to use Nearby Help.'
    if (code === 2) return 'Location is unavailable right now. Please try again.'
    if (code === 3) return 'Location request timed out. Please retry.'
  }
  return 'Unable to fetch nearby help right now.'
}

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

const distanceText = (distanceMeters: number) =>
  distanceMeters < 1000 ? `${Math.round(distanceMeters)} m` : `${(distanceMeters / 1000).toFixed(1)} km`

export const UserNearbyHelp = () => {
  const { token } = useAuth()
  const [location, setLocation] = useState<CurrentLocation | null>(null)
  const [places, setPlaces] = useState<NearbyHelpPlace[]>([])
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null)
  const [route, setRoute] = useState<NearbyHelpRoute | null>(null)
  const [loadingLocation, setLoadingLocation] = useState(false)
  const [loadingPlaces, setLoadingPlaces] = useState(false)
  const [loadingRoute, setLoadingRoute] = useState(false)
  const [error, setError] = useState('')

  const selectedPlace = useMemo(
    () => places.find((place) => place.id === selectedPlaceId) ?? null,
    [places, selectedPlaceId],
  )

  const routePath = useMemo(() => (route?.encodedPolyline ? decodePolyline(route.encodedPolyline) : []), [route?.encodedPolyline])

  const detectLocationAndLoad = async () => {
    if (!token) return
    setError('')
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by this browser.')
      return
    }

    try {
      setLoadingLocation(true)
      const currentLocation = await new Promise<CurrentLocation>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          (position) => resolve({ latitude: position.coords.latitude, longitude: position.coords.longitude }),
          (geoError) => reject(geoError),
          { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 },
        )
      })
      setLocation(currentLocation)

      setLoadingPlaces(true)
      const data = await nearbyHelpApi.list(token, currentLocation.latitude, currentLocation.longitude)
      setPlaces(data.places)
      setSelectedPlaceId(data.places[0]?.id ?? null)
      setRoute(null)
    } catch (caughtError) {
      const apiMessage =
        typeof caughtError === 'object' && caughtError && 'message' in caughtError && typeof caughtError.message === 'string'
          ? caughtError.message
          : getLocationErrorMessage(caughtError)
      setError(apiMessage)
    } finally {
      setLoadingLocation(false)
      setLoadingPlaces(false)
    }
  }

  const onFindRoute = async (place: NearbyHelpPlace) => {
    if (!token || !location) return
    setError('')
    setSelectedPlaceId(place.id)
    try {
      setLoadingRoute(true)
      const data = await nearbyHelpApi.getRoute(token, {
        originLatitude: location.latitude,
        originLongitude: location.longitude,
        destinationLatitude: place.latitude,
        destinationLongitude: place.longitude,
        destinationName: place.name,
      })
      setRoute(data.route)
    } catch (caughtError) {
      const apiMessage =
        typeof caughtError === 'object' && caughtError && 'message' in caughtError && typeof caughtError.message === 'string'
          ? caughtError.message
          : 'Unable to fetch walking route right now.'
      setError(apiMessage)
    } finally {
      setLoadingRoute(false)
    }
  }

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-[var(--color-brand-border)] bg-[var(--color-brand-dark)] p-5">
        <h2 className="text-2xl font-semibold text-[var(--color-brand-text)]">Nearby Help</h2>
        <p className="mt-1 text-sm text-[var(--color-brand-muted)]">
          Find nearby police stations and hospitals from your current location, and view a walking route to help.
        </p>
      </section>

      {error ? <InlineAlert message={error} /> : null}

      <section className="rounded-xl border border-[var(--color-brand-border)] bg-[var(--color-brand-dark)] p-4">
        <button
          className="rounded-md bg-[var(--color-brand-pink)] px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70"
          disabled={loadingLocation || loadingPlaces}
          onClick={() => void detectLocationAndLoad()}
          type="button"
        >
          {loadingLocation || loadingPlaces ? 'Detecting location & loading help...' : 'Find Nearby Help'}
        </button>
      </section>

      {location ? (
        <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_350px]">
          <article className="space-y-3 rounded-xl border border-[var(--color-brand-border)] bg-[var(--color-brand-dark)] p-4">
            <h3 className="text-lg font-semibold text-[var(--color-brand-text)]">Map & Route to Help</h3>
            <div className="h-80 overflow-hidden rounded-lg border border-[var(--color-brand-border)]">
              <MapContainer center={[location.latitude, location.longitude]} style={{ height: '100%', width: '100%' }} zoom={13}>
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <Marker
                  icon={getLocationPinIcon('var(--color-brand-text)', 30)}
                  position={[location.latitude, location.longitude]}
                />
                {places.map((place) => (
                  <Marker
                    eventHandlers={{
                      click: () => {
                        setSelectedPlaceId(place.id)
                        setRoute(null)
                      },
                    }}
                    icon={getLocationPinIcon(
                      place.id === selectedPlaceId ? 'var(--color-brand-pink)' : 'var(--color-brand-salmon)',
                      place.id === selectedPlaceId ? 32 : 26,
                    )}
                    key={place.id}
                    position={[place.latitude, place.longitude]}
                  />
                ))}
                {selectedPlace ? (
                  <MapFocusOnSelection latitude={selectedPlace.latitude} longitude={selectedPlace.longitude} />
                ) : null}
                {routePath.length > 1 ? (
                  <Polyline pathOptions={{ color: 'var(--color-brand-pink)', weight: 4, opacity: 0.9 }} positions={routePath} />
                ) : null}
              </MapContainer>
            </div>
            {route ? (
              <p className="rounded-md border border-[var(--color-brand-border)] bg-[var(--color-brand-pink-light)] px-3 py-2 text-sm text-[var(--color-brand-pink)]">
                Route to help: {route.walkingDurationText || 'Duration unavailable'} •{' '}
                {route.distanceMeters ? distanceText(route.distanceMeters) : 'Distance unavailable'}
              </p>
            ) : null}
          </article>

          <article className="space-y-2 rounded-xl border border-[var(--color-brand-border)] bg-[var(--color-brand-dark)] p-4">
            <h3 className="text-lg font-semibold text-[var(--color-brand-text)]">Nearby options</h3>
            {!places.length && !loadingPlaces ? <p className="text-sm text-[var(--color-brand-muted)]">No nearby options found yet.</p> : null}
            {places.map((place) => (
              <div
                className={`cursor-pointer rounded-lg border p-3 ${place.id === selectedPlaceId ? 'border-[var(--color-brand-pink)] bg-[var(--color-brand-pink-light)]' : 'border-[var(--color-brand-border)] bg-white'}`}
                key={place.id}
                onClick={() => {
                  setSelectedPlaceId(place.id)
                  setRoute(null)
                }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-[var(--color-brand-text)]">{place.name}</p>
                    <p className="text-xs text-[var(--color-brand-muted)]">{place.type === 'POLICE' ? 'Police Station' : 'Hospital'}</p>
                  </div>
                  <button
                    className="rounded-md border border-[var(--color-brand-border)] bg-white px-2 py-1 text-xs font-semibold text-[var(--color-brand-pink)] hover:bg-[var(--color-brand-pink-light)]"
                    onClick={(event) => {
                      event.stopPropagation()
                      setSelectedPlaceId(place.id)
                      setRoute(null)
                    }}
                    type="button"
                  >
                    Select
                  </button>
                </div>
                <p className="mt-2 text-xs text-[var(--color-brand-muted)]">{place.address}</p>
                <p className="mt-1 text-xs text-[var(--color-brand-text)]">
                  Distance: {distanceText(place.distanceMeters)} • {place.walkingDurationText || 'Walk time unavailable'}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {place.phoneNumber ? (
                    <a
                      className="rounded-md border border-[var(--color-brand-border)] bg-white px-3 py-1.5 text-xs font-semibold text-[var(--color-brand-pink)] hover:bg-[var(--color-brand-pink-light)]"
                      href={`tel:${place.phoneNumber}`}
                    >
                      CALL
                    </a>
                  ) : (
                    <button
                      className="cursor-not-allowed rounded-md border border-[var(--color-brand-border)] bg-[var(--color-brand-black-soft)] px-3 py-1.5 text-xs font-semibold text-[var(--color-brand-muted)]"
                      disabled
                      type="button"
                    >
                      CALL
                    </button>
                  )}
                  <a
                    className="rounded-md border border-[var(--color-brand-border)] bg-white px-3 py-1.5 text-xs font-semibold text-[var(--color-brand-pink)] hover:bg-[var(--color-brand-pink-light)]"
                    href={place.navigateUrl}
                    rel="noreferrer"
                    target="_blank"
                  >
                    NAVIGATE
                  </a>
                  <button
                    className="rounded-md bg-[var(--color-brand-pink)] px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90"
                    disabled={loadingRoute}
                    onClick={(event) => {
                      event.stopPropagation()
                      void onFindRoute(place)
                    }}
                    type="button"
                  >
                    {loadingRoute && selectedPlace?.id === place.id ? 'Loading route...' : 'Find Route to Help'}
                  </button>
                </div>
              </div>
            ))}
          </article>
        </section>
      ) : (
        <section className="rounded-xl border border-[var(--color-brand-border)] bg-[var(--color-brand-dark)] p-4 text-sm text-[var(--color-brand-muted)]">
          Allow location access and use “Find Nearby Help” to see nearby police stations, hospitals, and walking routes.
        </section>
      )}
    </div>
  )
}
