import type { Incident } from '../../types/incident.types'

export const normalizeStatus = (status: string) => status.toUpperCase()

export const statusToneClasses = (status: string) => {
  const normalized = normalizeStatus(status)
  if (normalized === 'ACTIVE') return 'bg-[#3a1212] text-[#EF4444]'
  if (normalized === 'PENDING') return 'bg-[#3a2910] text-[#F59E0B]'
  if (normalized === 'RESOLVED') return 'bg-[#13301f] text-[#22C55E]'
  if (normalized === 'CANCELLED') return 'bg-[#2a2a2a] text-[#A8A29E]'
  return 'bg-[#2a2a2a] text-[#F7E8E4]'
}

export const markerColorForStatus = (status: string) => {
  const normalized = normalizeStatus(status)
  if (normalized === 'ACTIVE') return '#EF4444'
  if (normalized === 'PENDING') return '#F59E0B'
  if (normalized === 'RESOLVED') return '#22C55E'
  if (normalized === 'CANCELLED') return '#6B7280'
  return '#F2A093'
}

export const incidentDate = (incident: Incident) => new Date(incident.createdAt)

export const toLocalTime = (isoDate: string) => new Date(isoDate).toLocaleString()

