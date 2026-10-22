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

const guardianResponseOptions = [
  { key: 'ON_MY_WAY', label: "I'm on my way." },
  { key: 'CHECKING_LOCATION', label: "I've received your alert and am checking your location." },
  { key: 'CONTACTING_TRUSTED_HELP', label: "I'm contacting another trusted person to help." },
  { key: 'STAY_SAFE_COORDINATING', label: "Please stay somewhere safe if possible. I'm coordinating assistance." },
  { key: 'ARRANGING_HELP', label: "I cannot reach you yet, but I'm arranging help." },
]

const getApiMessage = (apiError: unknown, fallback: string) =>
  typeof apiError === 'object' && apiError && 'message' in apiError && typeof apiError.message === 'string'
    ? apiError.message
    : fallback

export const GuardianJourneys = () => {
  const { token } = useAuth()
  const [journeys, setJourneys] = useState<Journey[]>([])
  const [selectedTemplateByJourney, setSelectedTemplateByJourney] = useState<Record<number, string>>({})
  const [customMessageByJourney, setCustomMessageByJourney] = useState<Record<number, string>>({})
  const [sendingByJourney, setSendingByJourney] = useState<Record<number, boolean>>({})
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const run = async () => {
      if (!token) return
      try {
        setLoading(true)
        const data = await journeyApi.list(token)
        setJourneys(data.journeys)
      } catch (apiError) {
        setError(getApiMessage(apiError, 'Could not load linked user journeys.'))
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

  const activeJourneys = useMemo(() => journeys.filter((item) => ['ACTIVE', 'CHECK_IN_REQUIRED', 'ESCALATED'].includes(item.status)), [journeys])

  const sendResponse = async (journey: Journey) => {
    if (!token || sendingByJourney[journey.id]) return
    const messageTemplateKey = selectedTemplateByJourney[journey.id] || ''
    const customMessage = (customMessageByJourney[journey.id] || '').trim()

    if (!messageTemplateKey && !customMessage) {
      setError('Choose a predefined guardian message or enter a custom message before sending.')
      return
    }

    try {
      setSendingByJourney((previous) => ({ ...previous, [journey.id]: true }))
      setError('')
      const response = await journeyApi.sendGuardianResponse(token, journey.id, {
        messageTemplateKey: messageTemplateKey || undefined,
        customMessage: customMessage || undefined,
      })
      setJourneys((previous) =>
        previous.map((item) =>
          item.id === journey.id
            ? {
                ...item,
                guardianResponses: [response.response, ...item.guardianResponses].slice(0, 100),
              }
            : item,
        ),
      )
      setCustomMessageByJourney((previous) => ({ ...previous, [journey.id]: '' }))
      setMessage(`Response sent to ${journey.plannedBy.name}.`)
    } catch (apiError) {
      setError(getApiMessage(apiError, 'Could not send guardian response.'))
    } finally {
      setSendingByJourney((previous) => ({ ...previous, [journey.id]: false }))
    }
  }

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-brand-border bg-brand-dark p-5">
        <h2 className="text-2xl font-semibold text-brand-text">Linked User Journeys</h2>
        <p className="mt-1 text-sm text-brand-muted">Monitor live safe-journey progress and check-in escalations for linked users.</p>
      </section>

      {error ? <InlineAlert message={error} /> : null}
      {message ? <InlineAlert message={message} /> : null}
      {loading ? <section className="rounded-xl border border-brand-border bg-brand-dark p-4 text-sm text-brand-muted">Loading journeys...</section> : null}

      {!loading && !journeys.length ? (
        <section className="rounded-xl border border-brand-border bg-brand-dark p-4 text-sm text-brand-muted">No linked user journey data yet.</section>
      ) : null}

      {!loading && activeJourneys.length ? (
        <section className="rounded-xl border border-brand-pink bg-brand-pink-light p-4">
          <p className="text-sm font-semibold text-brand-pink">Active / Escalated Journeys</p>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            {activeJourneys.map((journey) => (
              <article className="rounded-lg border border-brand-border bg-brand-dark p-3" key={journey.id}>
                <p className="text-sm font-semibold text-brand-text">{journey.title}</p>
                <p className="text-xs text-brand-muted">User: {journey.plannedBy.name}</p>
                <p className="text-xs text-brand-muted">Status: <span className="text-brand-text">{journey.status}</span></p>
                <p className="text-xs text-brand-muted">Destination: <span className="text-brand-text">{journey.destinationName}</span></p>
                <p className="text-xs text-brand-muted">Last location: <span className="text-brand-text">{journey.currentAddress ?? 'Unavailable'}</span></p>
                <p className="text-xs text-brand-muted">Last location time: <span className="text-brand-text">{journey.currentLocationAt ? new Date(journey.currentLocationAt).toLocaleString() : 'N/A'}</span></p>
                <p className="text-xs text-brand-muted">Route deviation count: <span className="text-brand-text">{journey.offRouteCount}</span></p>
                {journey.checkInExpiresAt ? (
                  <p className="text-xs text-brand-pink">Safety check-in pending until {new Date(journey.checkInExpiresAt).toLocaleString()}</p>
                ) : null}
                {journey.lastEscalationNotificationError ? (
                  <p className="text-xs text-brand-pink">Notification issue: {journey.lastEscalationNotificationError}</p>
                ) : null}
                <p className="text-xs text-brand-muted">Updated: <span className="text-brand-text">{new Date(journey.updatedAt).toLocaleString()}</span></p>
                <div className="mt-3 space-y-2 rounded-md border border-brand-border bg-brand-black-soft p-2">
                  <p className="text-xs font-semibold text-brand-text">Send response to end user</p>
                  <select
                    className="w-full rounded-md border border-brand-border bg-brand-dark px-2 py-1 text-xs text-brand-text"
                    onChange={(event) =>
                      setSelectedTemplateByJourney((previous) => ({
                        ...previous,
                        [journey.id]: event.target.value,
                      }))
                    }
                    value={selectedTemplateByJourney[journey.id] || ''}
                  >
                    <option value="">Select predefined response</option>
                    {guardianResponseOptions.map((option) => (
                      <option key={option.key} value={option.key}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <textarea
                    className="w-full rounded-md border border-brand-border bg-brand-dark px-2 py-1 text-xs text-brand-text"
                    maxLength={400}
                    onChange={(event) =>
                      setCustomMessageByJourney((previous) => ({
                        ...previous,
                        [journey.id]: event.target.value,
                      }))
                    }
                    placeholder="Or type a custom message (max 400 chars)"
                    rows={2}
                    value={customMessageByJourney[journey.id] || ''}
                  />
                  <button
                    className="rounded-md bg-brand-pink px-3 py-1 text-xs font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={Boolean(sendingByJourney[journey.id])}
                    onClick={() => void sendResponse(journey)}
                    type="button"
                  >
                    {sendingByJourney[journey.id] ? 'Sending…' : 'Send response'}
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {!loading && journeys.length ? (
        <section className="rounded-xl border border-brand-border bg-brand-dark p-5">
          <h3 className="text-lg font-semibold text-brand-text">Journey Timeline</h3>
          <div className="mt-3 space-y-3">
            {journeys.slice(0, 30).map((journey) => (
              <article className="rounded-lg border border-brand-border bg-brand-black-soft p-3" key={journey.id}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold text-brand-text">#{journey.id} • {journey.destinationName}</p>
                  <span className="rounded bg-brand-dark px-2 py-0.5 text-xs text-brand-muted">{journey.status}</span>
                </div>
                <p className="mt-1 text-xs text-brand-muted">User: {journey.plannedBy.name} • Started: {journey.startedAt ? new Date(journey.startedAt).toLocaleString() : 'N/A'}</p>
                <p className="mt-1 text-xs text-brand-muted">Destination: {journey.destinationName}</p>
                <p className="mt-1 text-xs text-brand-muted">Last known: {journey.currentAddress ?? 'Unavailable'} {journey.currentLocationAt ? `(${new Date(journey.currentLocationAt).toLocaleString()})` : ''}</p>
                <p className="mt-1 text-xs text-brand-muted">Off-route count: {journey.offRouteCount}</p>
                {journey.checkInExpiresAt ? <p className="mt-1 text-xs text-brand-pink">Pending check-in until {new Date(journey.checkInExpiresAt).toLocaleString()}</p> : null}
                {journey.lastEscalationNotificationError ? <p className="mt-1 text-xs text-brand-pink">Notification issue: {journey.lastEscalationNotificationError}</p> : null}
                {journey.events[0] ? (
                  <p className="mt-2 text-xs text-brand-text">Latest event: {journey.events[0].message}</p>
                ) : null}
                {journey.guardianResponses[0] ? (
                  <p className="mt-1 text-xs text-brand-text">
                    Last guardian response: {journey.guardianResponses[0].message}
                  </p>
                ) : null}
              </article>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  )
}
