import { useEffect, useMemo, useRef, useState } from 'react'
import 'leaflet/dist/leaflet.css'
import '../../../vendor/leaflet-heat'
import L from 'leaflet'
import { CircleMarker, MapContainer, Marker, Popup, TileLayer, useMap, useMapEvents } from 'react-leaflet'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { InlineAlert } from '../../../components/ui'
import { getLocationPinIcon } from '../../../components/maps/map-marker-icons'
import { useAuth } from '../../../hooks/useAuth'
import { incidentAnalyticsApi } from '../../../services/incident-analytics.api'
import type { SafetyAnalyticsFilters, SafetyAnalyticsResponse } from '../../../types/incident-analytics.types'

const getApiMessage = (apiError: unknown, fallback: string) =>
  typeof apiError === 'object' && apiError && 'message' in apiError && typeof apiError.message === 'string'
    ? apiError.message
    : fallback

const HeatLayer = ({ points }: { points: SafetyAnalyticsResponse['map']['heatPoints'] }) => {
  const map = useMap()
  const layerRef = useRef<L.Layer | null>(null)

  useEffect(() => {
    if (layerRef.current) {
      map.removeLayer(layerRef.current)
      layerRef.current = null
    }
    if (!points.length) return
    const latlngs = points.map((point) => [point.latitude, point.longitude, point.intensity] as [number, number, number])
    const layer = L.heatLayer(latlngs, {
      radius: 24,
      blur: 18,
      maxZoom: 16,
      gradient: {
        0.15: '#ffe4f3',
        0.45: '#f472b6',
        0.75: '#ec4899',
        1.0: '#be185d',
      },
    })
    layer.addTo(map)
    layerRef.current = layer

    return () => {
      if (layerRef.current) {
        map.removeLayer(layerRef.current)
      }
    }
  }, [map, points])

  return null
}

const BoundsSync = ({
  enabled,
  onBoundsChanged,
}: {
  enabled: boolean
  onBoundsChanged: (bounds: { minLat: number; maxLat: number; minLng: number; maxLng: number }) => void
}) => {
  useMapEvents({
    moveend(event) {
      if (!enabled) return
      const bounds = event.target.getBounds()
      onBoundsChanged({
        minLat: bounds.getSouth(),
        maxLat: bounds.getNorth(),
        minLng: bounds.getWest(),
        maxLng: bounds.getEast(),
      })
    },
    zoomend(event) {
      if (!enabled) return
      const bounds = event.target.getBounds()
      onBoundsChanged({
        minLat: bounds.getSouth(),
        maxLat: bounds.getNorth(),
        minLng: bounds.getWest(),
        maxLng: bounds.getEast(),
      })
    },
  })
  return null
}

const MapAutoFit = ({ analytics }: { analytics: SafetyAnalyticsResponse | null }) => {
  const map = useMap()
  useEffect(() => {
    const bounds = analytics?.map.bounds
    if (!bounds) return
    map.fitBounds(
      [
        [bounds.minLat, bounds.minLng],
        [bounds.maxLat, bounds.maxLng],
      ],
      { padding: [20, 20], maxZoom: 13 },
    )
  }, [analytics, map])
  return null
}

export const AdminSafetyAnalytics = () => {
  const { token } = useAuth()
  const today = new Date()
  const defaultStart = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)

  const [filters, setFilters] = useState<SafetyAnalyticsFilters>({
    startDate: defaultStart.toISOString().slice(0, 10),
    endDate: today.toISOString().slice(0, 10),
    status: 'ALL',
    category: 'ALL',
    timeOfDay: 'ALL',
    cellSize: 0.01,
  })
  const [analytics, setAnalytics] = useState<SafetyAnalyticsResponse | null>(null)
  const [sliderIndex, setSliderIndex] = useState<number | null>(null)
  const [showViewportBounds, setShowViewportBounds] = useState(false)
  const [selectedHotspotArea, setSelectedHotspotArea] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [downloadLoading, setDownloadLoading] = useState(false)
  const requestIdRef = useRef(0)

  useEffect(() => {
    if (!token) return
    const requestId = ++requestIdRef.current
    const timer = window.setTimeout(async () => {
      try {
        setLoading(true)
        setError('')
        const sliderEndAt =
          analytics && sliderIndex !== null && analytics.slider.buckets[sliderIndex]
            ? analytics.slider.buckets[sliderIndex].end
            : undefined
        const data = await incidentAnalyticsApi.get(token, {
          ...filters,
          sliderEndAt,
        })
        if (requestId !== requestIdRef.current) return
        setAnalytics(data)
        setSliderIndex((previous) => {
          if (!data.slider.buckets.length) return null
          if (previous === null || previous >= data.slider.buckets.length) {
            return data.slider.buckets.length - 1
          }
          return previous
        })
      } catch (apiError) {
        if (requestId !== requestIdRef.current) return
        setError(getApiMessage(apiError, 'Could not load safety analytics.'))
      } finally {
        if (requestId === requestIdRef.current) {
          setLoading(false)
        }
      }
    }, 250)

    return () => window.clearTimeout(timer)
  }, [token, filters, sliderIndex]) // eslint-disable-line react-hooks/exhaustive-deps

  const visibleHotspots = useMemo(() => {
    if (!analytics) return []
    if (!selectedHotspotArea) return analytics.hotspots
    return analytics.hotspots.filter((item) => item.areaLabel === selectedHotspotArea)
  }, [analytics, selectedHotspotArea])

  const heatPoints = useMemo(() => {
    if (!analytics) return []
    if (!selectedHotspotArea) return analytics.map.heatPoints
    const selected = analytics.hotspots.find((item) => item.areaLabel === selectedHotspotArea)
    if (!selected) return analytics.map.heatPoints
    return analytics.map.heatPoints.filter((point) => {
      const latDiff = Math.abs(point.latitude - selected.latitude)
      const lngDiff = Math.abs(point.longitude - selected.longitude)
      return latDiff < 0.03 && lngDiff < 0.03
    })
  }, [analytics, selectedHotspotArea])

  const markers = useMemo(() => {
    if (!analytics) return []
    if (!selectedHotspotArea) return analytics.map.markers
    return analytics.map.markers.filter((item) => item.areaLabel === selectedHotspotArea)
  }, [analytics, selectedHotspotArea])

  const trendData = useMemo(
    () =>
      (analytics?.charts.trend || []).map((item) => ({
        bucket: new Date(item.bucket).toISOString().slice(0, 10),
        count: item.count,
      })),
    [analytics?.charts.trend],
  )

  const downloadCsv = async () => {
    if (!token) return
    try {
      setDownloadLoading(true)
      const sliderEndAt =
        analytics && sliderIndex !== null && analytics.slider.buckets[sliderIndex]
          ? analytics.slider.buckets[sliderIndex].end
          : undefined
      const blob = await incidentAnalyticsApi.downloadCsv(token, {
        ...filters,
        sliderEndAt,
      })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `safety-analytics-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.csv`
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (apiError) {
      setError(getApiMessage(apiError, 'Could not download analytics report.'))
    } finally {
      setDownloadLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-brand-border bg-brand-dark p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-semibold text-brand-text">Safety Heatmap & Area Insights</h2>
            <p className="mt-1 text-sm text-brand-muted">
              Historical incident patterns by place, time, category, and status.
            </p>
          </div>
          <button
            className="rounded-md bg-brand-pink px-3 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-70"
            disabled={downloadLoading || !analytics}
            onClick={() => void downloadCsv()}
            type="button"
          >
            {downloadLoading ? 'Preparing CSV…' : 'Download Report'}
          </button>
        </div>
        <p className="mt-3 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Historical incident patterns — not a prediction of current danger.
        </p>
      </section>

      {error ? <InlineAlert message={error} /> : null}

      <section className="rounded-xl border border-brand-border bg-brand-dark p-4">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <label className="text-sm text-brand-muted">
            Start date (UTC)
            <input
              className="mt-1 w-full rounded-md border border-brand-border bg-brand-black-soft px-3 py-2 text-sm text-brand-text"
              onChange={(event) => {
                setSliderIndex(null)
                setFilters((previous) => ({ ...previous, startDate: event.target.value }))
              }}
              type="date"
              value={filters.startDate || ''}
            />
          </label>
          <label className="text-sm text-brand-muted">
            End date (UTC)
            <input
              className="mt-1 w-full rounded-md border border-brand-border bg-brand-black-soft px-3 py-2 text-sm text-brand-text"
              onChange={(event) => {
                setSliderIndex(null)
                setFilters((previous) => ({ ...previous, endDate: event.target.value }))
              }}
              type="date"
              value={filters.endDate || ''}
            />
          </label>
          <label className="text-sm text-brand-muted">
            Incident status
            <select
              className="mt-1 w-full rounded-md border border-brand-border bg-brand-black-soft px-3 py-2 text-sm text-brand-text"
              onChange={(event) => {
                setSliderIndex(null)
                setFilters((previous) => ({ ...previous, status: event.target.value }))
              }}
              value={filters.status || 'ALL'}
            >
              <option value="ALL">All statuses</option>
              <option value="ACTIVE">ACTIVE</option>
              <option value="RESOLVED">RESOLVED</option>
              <option value="CANCELLED">CANCELLED</option>
            </select>
          </label>
          <label className="text-sm text-brand-muted">
            Time of day
            <select
              className="mt-1 w-full rounded-md border border-brand-border bg-brand-black-soft px-3 py-2 text-sm text-brand-text"
              onChange={(event) => {
                setSliderIndex(null)
                setFilters((previous) => ({ ...previous, timeOfDay: event.target.value as SafetyAnalyticsFilters['timeOfDay'] }))
              }}
              value={filters.timeOfDay || 'ALL'}
            >
              <option value="ALL">All day</option>
              <option value="NIGHT">Night (00:00–05:59)</option>
              <option value="MORNING">Morning (06:00–11:59)</option>
              <option value="AFTERNOON">Afternoon (12:00–17:59)</option>
              <option value="EVENING">Evening (18:00–23:59)</option>
            </select>
          </label>
          <label className="text-sm text-brand-muted">
            Category
            <select
              className="mt-1 w-full rounded-md border border-brand-border bg-brand-black-soft px-3 py-2 text-sm text-brand-text"
              onChange={(event) => {
                setSliderIndex(null)
                setFilters((previous) => ({ ...previous, category: event.target.value }))
              }}
              value={filters.category || 'ALL'}
            >
              <option value="ALL">All categories</option>
              {(analytics?.options.categories || []).map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm text-brand-muted">
            Aggregation interval
            <select
              className="mt-1 w-full rounded-md border border-brand-border bg-brand-black-soft px-3 py-2 text-sm text-brand-text"
              onChange={(event) => {
                setSliderIndex(null)
                setFilters((previous) => ({ ...previous, granularity: event.target.value as SafetyAnalyticsFilters['granularity'] }))
              }}
              value={filters.granularity || ''}
            >
              <option value="">Auto</option>
              <option value="hour">Hour</option>
              <option value="day">Day</option>
              <option value="week">Week</option>
              <option value="month">Month</option>
            </select>
          </label>
          <label className="text-sm text-brand-muted">
            Area cell size
            <select
              className="mt-1 w-full rounded-md border border-brand-border bg-brand-black-soft px-3 py-2 text-sm text-brand-text"
              onChange={(event) => {
                setSliderIndex(null)
                setFilters((previous) => ({ ...previous, cellSize: Number(event.target.value) }))
              }}
              value={String(filters.cellSize || 0.01)}
            >
              <option value="0.005">Fine</option>
              <option value="0.01">Balanced</option>
              <option value="0.02">Broad</option>
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm text-brand-muted">
            <input
              checked={showViewportBounds}
              onChange={(event) => {
                setSliderIndex(null)
                setShowViewportBounds(event.target.checked)
                if (!event.target.checked) {
                  setFilters((previous) => {
                    const next = { ...previous }
                    delete next.minLat
                    delete next.maxLat
                    delete next.minLng
                    delete next.maxLng
                    return next
                  })
                }
              }}
              type="checkbox"
            />
            Filter by visible map area
          </label>
        </div>
      </section>

      {analytics ? (
        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <article className="rounded-xl border border-brand-border bg-brand-dark p-4">
            <p className="text-xs uppercase text-brand-muted">Matching incidents</p>
            <p className="mt-1 text-2xl font-semibold text-brand-text">{analytics.summary.matchingIncidents}</p>
          </article>
          <article className="rounded-xl border border-brand-border bg-brand-dark p-4">
            <p className="text-xs uppercase text-brand-muted">Distinct areas</p>
            <p className="mt-1 text-2xl font-semibold text-brand-text">{analytics.summary.distinctAreas}</p>
          </article>
          <article className="rounded-xl border border-brand-border bg-brand-dark p-4">
            <p className="text-xs uppercase text-brand-muted">Top category</p>
            <p className="mt-1 text-lg font-semibold text-brand-text">
              {analytics.summary.topCategory ? analytics.summary.topCategory.category : 'N/A'}
            </p>
          </article>
          <article className="rounded-xl border border-brand-border bg-brand-dark p-4">
            <p className="text-xs uppercase text-brand-muted">Top category count</p>
            <p className="mt-1 text-2xl font-semibold text-brand-text">{analytics.summary.topCategory?.count ?? 0}</p>
          </article>
          <article className="rounded-xl border border-brand-border bg-brand-dark p-4">
            <p className="text-xs uppercase text-brand-muted">No usable coordinates</p>
            <p className="mt-1 text-2xl font-semibold text-brand-text">{analytics.summary.withoutUsableCoordinates}</p>
          </article>
        </section>
      ) : null}

      {analytics ? (
        <section className="rounded-xl border border-brand-border bg-brand-dark p-4">
          <p className="text-sm font-semibold text-brand-text">Time slider (UTC)</p>
          {!analytics.slider.buckets.length ? (
            <p className="mt-2 text-sm text-brand-muted">No timeline buckets available for this filter set.</p>
          ) : (
            <>
              <input
                className="mt-3 w-full"
                max={analytics.slider.buckets.length - 1}
                min={0}
                onChange={(event) => setSliderIndex(Number(event.target.value))}
                type="range"
                value={sliderIndex ?? analytics.slider.buckets.length - 1}
              />
              <p className="mt-1 text-xs text-brand-muted">
                Window end:{' '}
                {analytics.slider.buckets[sliderIndex ?? analytics.slider.buckets.length - 1]?.label} ({analytics.timezone})
              </p>
            </>
          )}
        </section>
      ) : null}

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <article className="rounded-xl border border-brand-border bg-brand-dark p-4">
          <h3 className="text-lg font-semibold text-brand-text">Incident Density Heatmap</h3>
          <p className="mt-1 text-xs text-brand-muted">
            Incident counts are historical records and may reflect reporting coverage, not guaranteed current risk.
          </p>
          <div className="mt-3 h-[30rem] overflow-hidden rounded-lg border border-brand-border">
            <MapContainer center={[20.5937, 78.9629]} style={{ height: '100%', width: '100%' }} zoom={5}>
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              {analytics ? <HeatLayer points={heatPoints} /> : null}
              {analytics ? <MapAutoFit analytics={analytics} /> : null}
              <BoundsSync
                enabled={showViewportBounds}
                onBoundsChanged={(bounds) => {
                  setSliderIndex(null)
                  setFilters((previous) => ({ ...previous, ...bounds }))
                }}
              />
              {visibleHotspots.map((hotspot) => (
                <CircleMarker
                  center={[hotspot.latitude, hotspot.longitude]}
                  key={`${hotspot.rank}-${hotspot.areaLabel}`}
                  pathOptions={{ color: '#be185d', fillColor: '#ec4899', fillOpacity: 0.25 }}
                  radius={Math.min(32, 8 + hotspot.incidentCount)}
                >
                  <Popup>
                    <div className="space-y-1 text-sm">
                      <p className="font-semibold">{hotspot.areaLabel}</p>
                      <p>Incidents: {hotspot.incidentCount}</p>
                      <p>Top category: {hotspot.topCategory}</p>
                    </div>
                  </Popup>
                </CircleMarker>
              ))}
              {markers.slice(0, 250).map((item) => (
                <Marker
                  icon={getLocationPinIcon('var(--color-brand-pink)', 24)}
                  key={`${item.incidentId}-${item.timestamp}`}
                  position={[item.latitude, item.longitude]}
                >
                  <Popup>
                    <div className="space-y-1 text-sm">
                      <p className="font-semibold">Incident #{item.incidentId}</p>
                      <p>Category: {item.category}</p>
                      <p>Status: {item.status}</p>
                      <p>Time: {new Date(item.timestamp).toLocaleString()} (UTC source)</p>
                      <p>Area: {item.areaLabel}</p>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>
          {!analytics?.map.heatPoints.length ? (
            <p className="mt-3 rounded-md border border-brand-border bg-brand-black-soft px-3 py-2 text-sm text-brand-muted">
              No incidents with usable coordinates match current filters.
            </p>
          ) : null}
        </article>

        <aside className="space-y-4">
          <section className="rounded-xl border border-brand-border bg-brand-dark p-4">
            <h3 className="text-lg font-semibold text-brand-text">Historical Hotspots</h3>
            <p className="mt-1 text-xs text-brand-muted">
              Rankings use recorded incidents only, not verified crime rates or population-adjusted risk.
            </p>
            <div className="mt-3 space-y-2">
              {(analytics?.hotspots || []).length ? (
                analytics!.hotspots.map((hotspot) => (
                  <button
                    className={`w-full rounded-lg border px-3 py-2 text-left ${
                      selectedHotspotArea === hotspot.areaLabel
                        ? 'border-brand-pink bg-brand-pink-light'
                        : 'border-brand-border bg-brand-black-soft'
                    }`}
                    key={`${hotspot.rank}-${hotspot.areaLabel}`}
                    onClick={() =>
                      setSelectedHotspotArea((previous) => (previous === hotspot.areaLabel ? null : hotspot.areaLabel))
                    }
                    type="button"
                  >
                    <p className="text-sm font-semibold text-brand-text">
                      #{hotspot.rank} {hotspot.areaLabel}
                    </p>
                    <p className="text-xs text-brand-muted">
                      {hotspot.incidentCount} incidents • Top: {hotspot.topCategory}
                    </p>
                  </button>
                ))
              ) : (
                <p className="text-sm text-brand-muted">No hotspots for current filters.</p>
              )}
            </div>
          </section>
          <section className="rounded-xl border border-brand-border bg-brand-dark p-4 text-sm text-brand-muted">
            <p className="font-semibold text-brand-text">Data coverage note</p>
            <p className="mt-1">
              Records without usable coordinates are counted in summaries separately and are excluded from map density.
            </p>
          </section>
        </aside>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <article className="rounded-xl border border-brand-border bg-brand-dark p-4">
          <h3 className="text-base font-semibold text-brand-text">Incidents over time</h3>
          <div className="mt-3 h-64">
            {trendData.length ? (
              <ResponsiveContainer height="100%" width="100%">
                <LineChart data={trendData}>
                  <CartesianGrid stroke="#f3c1db" strokeDasharray="3 3" />
                  <XAxis dataKey="bucket" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Line dataKey="count" stroke="#db2777" strokeWidth={2} type="monotone" />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-brand-muted">No trend data for this filter range.</p>
            )}
          </div>
        </article>

        <article className="rounded-xl border border-brand-border bg-brand-dark p-4">
          <h3 className="text-base font-semibold text-brand-text">Incident category distribution</h3>
          <div className="mt-3 h-64">
            {(analytics?.charts.categoryDistribution || []).length ? (
              <ResponsiveContainer height="100%" width="100%">
                <BarChart data={analytics?.charts.categoryDistribution || []}>
                  <CartesianGrid stroke="#f3c1db" strokeDasharray="3 3" />
                  <XAxis dataKey="category" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#ec4899" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-brand-muted">No category distribution data.</p>
            )}
          </div>
        </article>

        <article className="rounded-xl border border-brand-border bg-brand-dark p-4">
          <h3 className="text-base font-semibold text-brand-text">Incidents by time of day</h3>
          <div className="mt-3 h-64">
            {(analytics?.charts.timeOfDay || []).length ? (
              <ResponsiveContainer height="100%" width="100%">
                <BarChart data={analytics?.charts.timeOfDay || []}>
                  <CartesianGrid stroke="#f3c1db" strokeDasharray="3 3" />
                  <XAxis dataKey="bucket" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#f97316" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-brand-muted">No time-of-day data.</p>
            )}
          </div>
        </article>

        <article className="rounded-xl border border-brand-border bg-brand-dark p-4">
          <h3 className="text-base font-semibold text-brand-text">Top areas by recorded incidents</h3>
          <div className="mt-3 h-64">
            {(analytics?.charts.topAreas || []).length ? (
              <ResponsiveContainer height="100%" width="100%">
                <BarChart data={analytics?.charts.topAreas || []} layout="vertical">
                  <CartesianGrid stroke="#f3c1db" strokeDasharray="3 3" />
                  <XAxis allowDecimals={false} tick={{ fontSize: 11 }} type="number" />
                  <YAxis dataKey="area" tick={{ fontSize: 11 }} type="category" width={120} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#be185d" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-brand-muted">No area ranking data.</p>
            )}
          </div>
        </article>
      </section>

      {loading ? (
        <section className="rounded-xl border border-brand-border bg-brand-dark p-4 text-sm text-brand-muted">
          Loading analytics...
        </section>
      ) : null}
    </div>
  )
}
