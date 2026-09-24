export type IncidentStatus = 'ACTIVE' | 'RESOLVED' | 'CANCELLED'

export type IncidentActor = {
  id: number
  name: string
  email: string
  mobile?: string | null
  role: 'ADMIN' | 'GUARDIAN' | 'END_USER'
}

export type IncidentLocation = {
  id: number
  latitude: number
  longitude: number
  address: string | null
  source: string
  createdAt: string
  createdById: number
}

export type Incident = {
  id: number
  title: string
  description: string | null
  status: IncidentStatus
  reportedById: number
  resolvedById: number | null
  resolvedAt: string | null
  createdAt: string
  updatedAt: string
  reportedBy: IncidentActor
  resolvedBy: IncidentActor | null
  locationLogs: IncidentLocation[]
}
