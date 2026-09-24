import type { Incident } from '../../types/incident.types'

export type IncidentFilterStatus = 'ALL' | 'ACTIVE' | 'PENDING' | 'RESOLVED' | 'CANCELLED'

export type IncidentSort = 'newest' | 'oldest'

export type IncidentFilterState = {
  search: string
  status: IncidentFilterStatus
  type: string
  date: string
  sort: IncidentSort
}

export type AdminIncidentSummary = {
  active: number
  pending: number
  resolved: number
  total: number
}

export type SelectedIncident = Incident | null

