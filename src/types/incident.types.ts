export type IncidentStatus = 'ACTIVE' | 'PENDING' | 'RESOLVED' | 'CANCELLED'
export type IncidentResolvedBy = 'USER' | 'GUARDIAN' | 'ADMIN'

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
  accuracy: number | null
  locationTimestamp: string
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
  resolvedByRole: IncidentResolvedBy | null
  resolvedAt: string | null
  resolutionNote: string | null
  createdAt: string
  updatedAt: string
  reportedBy: IncidentActor
  resolvedBy: IncidentActor | null
  locationLogs: IncidentLocation[]
}
