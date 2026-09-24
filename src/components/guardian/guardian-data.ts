import type { Incident } from '../../types/incident.types'

export type GuardianSummary = {
  active: number
  linkedUsers: number
  incidentsToday: number
  resolved: number
  total: number
}

export type GuardianLinkedUser = {
  id: number
  name: string
  safetyStatus: 'SAFE' | 'ACTIVE_EMERGENCY'
  lastIncidentAt: string | null
  lastActivityAt: string | null
}

const toDayKey = (date: string) => new Date(date).toISOString().slice(0, 10)

export const getGuardianSummary = (incidents: Incident[]): GuardianSummary => {
  const today = toDayKey(new Date().toISOString())
  const linkedUsers = new Set(incidents.map((incident) => incident.reportedById)).size

  return {
    active: incidents.filter((incident) => incident.status === 'ACTIVE').length,
    linkedUsers,
    incidentsToday: incidents.filter((incident) => toDayKey(incident.createdAt) === today).length,
    resolved: incidents.filter((incident) => incident.status === 'RESOLVED').length,
    total: incidents.length,
  }
}

export const getLinkedUsersFromIncidents = (incidents: Incident[]): GuardianLinkedUser[] => {
  const grouped = new Map<number, Incident[]>()
  incidents.forEach((incident) => {
    const existing = grouped.get(incident.reportedById)
    if (existing) {
      existing.push(incident)
    } else {
      grouped.set(incident.reportedById, [incident])
    }
  })

  return [...grouped.entries()].map(([userId, userIncidents]) => {
    const sorted = [...userIncidents].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    const latest = sorted[0]
    const hasActive = userIncidents.some((incident) => incident.status === 'ACTIVE')
    const latestLocation = latest.locationLogs[0]
    const lastActivityAt = latestLocation?.locationTimestamp ?? latest.updatedAt

    return {
      id: userId,
      name: latest.reportedBy.name,
      safetyStatus: hasActive ? 'ACTIVE_EMERGENCY' : 'SAFE',
      lastIncidentAt: latest.createdAt,
      lastActivityAt,
    }
  })
}

