import { Fragment, useEffect, useMemo } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { CircleMarker, MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet'
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'
import type { Incident } from '../../types/incident.types'
import { markerColorForStatus } from './incident-ui'

L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
})

type IncidentMapPanelProps = {
  incidents: Incident[]
  selectedIncidentId: number | null
}

const FallbackCenter: [number, number] = [20.5937, 78.9629]

const MapFocus = ({ selectedIncident }: { selectedIncident: Incident | null }) => {
  const map = useMap()

  useEffect(() => {
    if (!selectedIncident || !selectedIncident.locationLogs.length) return
    const latest = selectedIncident.locationLogs[0]
    map.flyTo([latest.latitude, latest.longitude], 15, { duration: 0.6 })
  }, [map, selectedIncident])

  return null
}

export const IncidentMapPanel = ({ incidents, selectedIncidentId }: IncidentMapPanelProps) => {
  const mapped = useMemo(
    () => incidents.filter((incident) => incident.locationLogs.length && Number.isFinite(incident.locationLogs[0].latitude)),
    [incidents],
  )

  const selectedIncident = useMemo(
    () => mapped.find((incident) => incident.id === selectedIncidentId) ?? null,
    [mapped, selectedIncidentId],
  )

  const center = selectedIncident
    ? ([selectedIncident.locationLogs[0].latitude, selectedIncident.locationLogs[0].longitude] as [number, number])
    : mapped.length
      ? ([mapped[0].locationLogs[0].latitude, mapped[0].locationLogs[0].longitude] as [number, number])
      : FallbackCenter

  return (
    <div className="h-[62vh] min-h-[420px] overflow-hidden rounded-xl border border-[#252525] bg-[#111111]">
      <MapContainer center={center} style={{ height: '100%', width: '100%' }} zoom={mapped.length ? 12 : 5}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {mapped.map((incident) => {
          const latest = incident.locationLogs[0]
          const selected = incident.id === selectedIncidentId
          const color = markerColorForStatus(incident.status)

          return (
            <Fragment key={incident.id}>
              <Marker position={[latest.latitude, latest.longitude]}>
                <Popup>
                  <p className="font-semibold">{incident.title}</p>
                  <p>Incident #{incident.id}</p>
                  <p>Status: {incident.status}</p>
                  <p>{latest.address ?? 'Address not available'}</p>
                </Popup>
              </Marker>
              {selected ? (
                <CircleMarker
                  center={[latest.latitude, latest.longitude]}
                  pathOptions={{ color: '#F2A093', fillColor: '#F2A093', fillOpacity: 0.25 }}
                  radius={18}
                />
              ) : null}
              <CircleMarker center={[latest.latitude, latest.longitude]} pathOptions={{ color, fillColor: color, fillOpacity: 0.9 }} radius={6} />
            </Fragment>
          )
        })}
        <MapFocus selectedIncident={selectedIncident} />
      </MapContainer>
    </div>
  )
}
