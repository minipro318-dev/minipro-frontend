import { useEffect, useMemo, useState } from 'react'
import { InlineAlert } from '../../../components/ui'
import { useAuth } from '../../../hooks/useAuth'
import { journeyApi } from '../../../services/journey.api'
import {
  createRealtimeSocket,
  type JourneyGuardianResponseRealtimePayload,
  type JourneyRealtimePayload,
} from '../../../services/realtime'
import type { Journey } from '../../../types/journey.types'

const getApiMessage = (apiError: unknown, fallback: string) =>
  typeof apiError === 'object' && apiError && 'message' in apiError && typeof apiError.message === 'string'
    ? apiError.message
    : fallback

export const AdminJourneys = () => {
  const { token } = useAuth()
  const [journeys, setJourneys] = useState<Journey[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const run = async () => {
      if (!token) return
      try {
        setLoading(true)
        const data = await journeyApi.list(token)
        setJourneys(data.journeys)
      } catch (apiError) {
        setError(getApiMessage(apiError, 'Could not load safe journey records.'))
      } finally {
        setLoading(false)
      }
    }
    void run()
  }, [token])

  useEffect(() => {
    if (!token) return
    const socket = createRealtimeSocket(token)

    const onJourneyUpdate = (payload: JourneyRealtimePayload) => {
      setJourneys((previous) => {
        const next = [payload.journey, ...previous.filter((journey) => journey.id !== payload.journey.id)]
        return next.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      })
    }

    const onGuardianResponse = (payload: JourneyGuardianResponseRealtimePayload) => {
      setJourneys((previous) =>
        previous.map((journey) => {
          if (journey.id !== payload.journeyId) return journey
          const exists = journey.guardianResponses.some((item) => item.id === payload.response.id)
          if (exists) return journey
          return {
            ...journey,
            guardianResponses: [payload.response, ...journey.guardianResponses].slice(0, 100),
          }
        }),
      )
    }

    socket.on('journey:created', onJourneyUpdate)
    socket.on('journey:updated', onJourneyUpdate)
    socket.on('journey:guardian-response', onGuardianResponse)

    return () => {
      socket.off('journey:created', onJourneyUpdate)
      socket.off('journey:updated', onJourneyUpdate)
      socket.off('journey:guardian-response', onGuardianResponse)
      socket.disconnect()
    }
  }, [token])

  const stats = useMemo(() => {
    const active = journeys.filter((item) => item.status === 'ACTIVE').length
    const checkInRequired = journeys.filter((item) => item.status === 'CHECK_IN_REQUIRED').length
    const escalated = journeys.filter((item) => item.status === 'ESCALATED').length
    const completed = journeys.filter((item) => item.status === 'COMPLETED').length
    return { total: journeys.length, active, checkInRequired, escalated, completed }
  }, [journeys])

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-brand-border bg-brand-dark p-5">
        <h2 className="text-2xl font-semibold text-brand-text">Safe Journey Monitoring</h2>
        <p className="mt-1 text-sm text-brand-muted">Administrative visibility into planned routes, check-ins, and escalations.</p>
      </section>

      {error ? <InlineAlert message={error} /> : null}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <article className="rounded-xl border border-brand-border bg-brand-dark p-4">
          <p className="text-xs uppercase text-brand-muted">Total</p>
          <p className="mt-1 text-2xl font-semibold text-brand-pink">{stats.total}</p>
        </article>
        <article className="rounded-xl border border-brand-border bg-brand-dark p-4">
          <p className="text-xs uppercase text-brand-muted">Active</p>
          <p className="mt-1 text-2xl font-semibold text-brand-pink">{stats.active}</p>
        </article>
        <article className="rounded-xl border border-brand-border bg-brand-dark p-4">
          <p className="text-xs uppercase text-brand-muted">Check-in Required</p>
          <p className="mt-1 text-2xl font-semibold text-brand-pink">{stats.checkInRequired}</p>
        </article>
        <article className="rounded-xl border border-brand-border bg-brand-dark p-4">
          <p className="text-xs uppercase text-brand-muted">Escalated</p>
          <p className="mt-1 text-2xl font-semibold text-brand-pink">{stats.escalated}</p>
        </article>
        <article className="rounded-xl border border-brand-border bg-brand-dark p-4">
          <p className="text-xs uppercase text-brand-muted">Completed</p>
          <p className="mt-1 text-2xl font-semibold text-brand-pink">{stats.completed}</p>
        </article>
      </section>

      <section className="rounded-xl border border-brand-border bg-brand-dark p-5">
        <h3 className="text-lg font-semibold text-brand-text">Recent Journey Activity</h3>
        {loading ? <p className="mt-3 text-sm text-brand-muted">Loading journeys...</p> : null}
        {!loading && !journeys.length ? <p className="mt-3 text-sm text-brand-muted">No journey records found.</p> : null}
        {!loading && journeys.length ? (
          <div className="mt-3 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-brand-muted">
                <tr>
                  <th className="pb-2">Journey</th>
                  <th className="pb-2">User</th>
                  <th className="pb-2">Status</th>
                  <th className="pb-2">Destination</th>
                  <th className="pb-2">Deviation Count</th>
                  <th className="pb-2">Pending Check-in</th>
                  <th className="pb-2">Last Location Time</th>
                  <th className="pb-2">Escalation Incident</th>
                  <th className="pb-2">Notification</th>
                  <th className="pb-2">Latest Guardian Response</th>
                </tr>
              </thead>
              <tbody>
                {journeys.slice(0, 50).map((journey) => (
                  <tr className="border-t border-brand-border" key={journey.id}>
                    <td className="py-2 text-brand-text">
                      #{journey.id} • {journey.destinationName}
                    </td>
                    <td className="py-2 text-brand-text">{journey.plannedBy.name}</td>
                    <td className="py-2 text-brand-text">{journey.status}</td>
                    <td className="py-2 text-brand-text">{journey.destinationName}</td>
                    <td className="py-2 text-brand-text">{journey.offRouteCount}</td>
                    <td className="py-2 text-brand-text">
                      {journey.checkInExpiresAt ? new Date(journey.checkInExpiresAt).toLocaleString() : '—'}
                    </td>
                    <td className="py-2 text-brand-text">
                      {journey.currentLocationAt ? new Date(journey.currentLocationAt).toLocaleString() : 'N/A'}
                    </td>
                    <td className="py-2 text-brand-text">
                      {journey.escalationIncidentId ? `#${journey.escalationIncidentId}` : '—'}
                    </td>
                    <td className="py-2 text-brand-text">
                      {journey.lastEscalationNotificationError ?? 'OK'}
                    </td>
                    <td className="py-2 text-brand-text">
                      {journey.guardianResponses[0]
                        ? `${journey.guardianResponses[0].guardian.name}: ${journey.guardianResponses[0].message}`
                        : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>
    </div>
  )
}
