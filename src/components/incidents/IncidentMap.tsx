import { useMemo } from 'react'
import 'leaflet/dist/leaflet.css'
import { MapContainer, Marker, Polyline, Popup, TileLayer } from 'react-leaflet'
import { getLocationPinIcon } from '../maps/map-marker-icons'
import type { Incident } from '../../types/incident.types'

type IncidentMapProps = {
  incident: Incident
}

export const IncidentMap = ({ incident }: IncidentMapProps) => {
  const points = useMemo(
    () =>
      [...incident.locationLogs]
        .reverse()
        .map((location) => [location.latitude, location.longitude] as [number, number]),
    [incident.locationLogs],
  )

  if (!points.length) {
    return <p className="text-sm text-brand-muted">Location not available for this incident.</p>
  }

  const initialLocation = incident.locationLogs[incident.locationLogs.length - 1]
  const latestLocation = incident.locationLogs[0]
  const mapCenter = points[points.length - 1]

  return (
    <div className="space-y-2">
      <div className="h-64 overflow-hidden rounded-lg border border-brand-border">
        <MapContainer center={mapCenter} style={{ height: '100%', width: '100%' }} zoom={15}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <Marker
            icon={getLocationPinIcon('var(--color-brand-salmon)', 26)}
            position={[initialLocation.latitude, initialLocation.longitude]}
          >
            <Popup>Initial SOS location</Popup>
          </Marker>
          <Marker
            icon={getLocationPinIcon('var(--color-brand-pink)', 30)}
            position={[latestLocation.latitude, latestLocation.longitude]}
          >
            <Popup>Latest location</Popup>
          </Marker>
          {points.length > 1 ? <Polyline pathOptions={{ color: '#f3b5a9' }} positions={points} /> : null}
        </MapContainer>
      </div>
      <p className="text-xs text-brand-muted">
        {incident.status === 'ACTIVE' ? 'Live status: active (last known GPS from browser).' : 'Live status: inactive. Showing last known location.'}
      </p>
    </div>
  )
}
