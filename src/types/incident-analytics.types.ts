export type AnalyticsTimeOfDay = 'ALL' | 'NIGHT' | 'MORNING' | 'AFTERNOON' | 'EVENING'
export type AnalyticsGranularity = 'hour' | 'day' | 'week' | 'month'
export type IncidentAnalyticsStatus = 'ACTIVE' | 'RESOLVED' | 'CANCELLED'

export type SafetyAnalyticsFilters = {
  startDate?: string
  endDate?: string
  status?: string
  category?: string
  timeOfDay?: AnalyticsTimeOfDay
  granularity?: AnalyticsGranularity
  cellSize?: number
  sliderEndAt?: string
  minLat?: number
  maxLat?: number
  minLng?: number
  maxLng?: number
}

export type SafetyAnalyticsResponse = {
  disclaimer: string
  timezone: string
  appliedFilters: {
    startDate: string
    endDate: string
    status: IncidentAnalyticsStatus[]
    category: string | null
    timeOfDay: AnalyticsTimeOfDay
    bounds: { minLat: number; maxLat: number; minLng: number; maxLng: number } | null
    cellSize: number
    granularity: AnalyticsGranularity
    sliderEndAt: string | null
  }
  options: {
    categories: string[]
    statuses: IncidentAnalyticsStatus[]
    timeOfDay: AnalyticsTimeOfDay[]
    granularity: AnalyticsGranularity[]
  }
  summary: {
    matchingIncidents: number
    distinctAreas: number
    withoutUsableCoordinates: number
    topCategory: { category: string; count: number } | null
    periodLabel: string
  }
  hotspots: Array<{
    rank: number
    latitude: number
    longitude: number
    areaLabel: string
    incidentCount: number
    topCategory: string
    periodLabel: string
  }>
  charts: {
    trend: Array<{ bucket: string; count: number }>
    categoryDistribution: Array<{ category: string; count: number }>
    timeOfDay: Array<{ bucket: string; count: number }>
    topAreas: Array<{ area: string; count: number }>
  }
  slider: {
    granularity: AnalyticsGranularity
    buckets: Array<{
      index: number
      label: string
      start: string
      end: string
      count: number
    }>
  }
  map: {
    heatPoints: Array<{
      latitude: number
      longitude: number
      intensity: number
      cellKey: string
    }>
    markers: Array<{
      incidentId: number
      latitude: number
      longitude: number
      status: string
      category: string
      timestamp: string
      areaLabel: string
    }>
    bounds: { minLat: number; maxLat: number; minLng: number; maxLng: number } | null
  }
}
