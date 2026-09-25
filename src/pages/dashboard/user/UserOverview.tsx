import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { StatusBadge } from '../../../components/common/StatusBadge'
import { InlineAlert } from '../../../components/ui'
import { useAuth } from '../../../hooks/useAuth'
import { guardianInviteApi } from '../../../services/guardian-invite.api'
import { incidentApi } from '../../../services/incident.api'
import { createRealtimeSocket, type IncidentRealtimePayload } from '../../../services/realtime'
import type { GuardianInvite } from '../../../types/guardian-invite.types'
import type { Incident } from '../../../types/incident.types'

type ActivityTone = 'safe' | 'warning' | 'danger' | 'neutral'

export const UserOverview = () => {
  const { token, user } = useAuth()
  const navigate = useNavigate()
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [invites, setInvites] = useState<GuardianInvite[]>([])
  const [error, setError] = useState('')
  const [isLocationAvailable, setIsLocationAvailable] = useState(false)
  const [locationCheckedAt, setLocationCheckedAt] = useState<string | null>(null)

  useEffect(() => {
    const run = async () => {
      if (!token) return
      try {
        const [incidentData, inviteData] = await Promise.all([incidentApi.list(token), guardianInviteApi.list(token)])
        setIncidents(incidentData.incidents)
        setInvites(inviteData.invites)
      } catch (apiError) {
        const message =
          typeof apiError === 'object' && apiError && 'message' in apiError && typeof apiError.message === 'string'
            ? apiError.message
            : 'Could not load overview.'
        setError(message)
      }
    }
    void run()
  }, [token])

  useEffect(() => {
    if (!token) return
    const socket = createRealtimeSocket(token)

    const onIncidentUpdate = (payload: IncidentRealtimePayload) => {
      if (payload.incident.reportedById !== user?.id) return
      setIncidents((previous) => {
        const next = [payload.incident, ...previous.filter((incident) => incident.id !== payload.incident.id)]
        return next.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      })
    }

    socket.on('incident:created', onIncidentUpdate)
    socket.on('incident:location-updated', onIncidentUpdate)
    socket.on('incident:status-updated', onIncidentUpdate)

    return () => {
      socket.off('incident:created', onIncidentUpdate)
      socket.off('incident:location-updated', onIncidentUpdate)
      socket.off('incident:status-updated', onIncidentUpdate)
      socket.disconnect()
    }
  }, [token, user?.id])

  useEffect(() => {
    if (!navigator.geolocation) {
      setIsLocationAvailable(false)
      setLocationCheckedAt(new Date().toISOString())
      return
    }
    navigator.geolocation.getCurrentPosition(
      () => {
        setIsLocationAvailable(true)
        setLocationCheckedAt(new Date().toISOString())
      },
      () => {
        setIsLocationAvailable(false)
        setLocationCheckedAt(new Date().toISOString())
      },
      { timeout: 8000, maximumAge: 60000 },
    )
  }, [])

  const stats = useMemo(() => {
    const active = incidents.filter((item) => item.status === 'ACTIVE').length
    const resolved = incidents.filter((item) => item.status === 'RESOLVED').length
    const connectedGuardians = invites.filter((item) => item.status === 'ACCEPTED').length
    const pendingInvites = invites.filter((item) => item.status === 'PENDING').length
    const latestIncident = [...incidents].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0] ?? null
    return { totalIncidents: incidents.length, active, resolved, pendingInvites, connectedGuardians, latestIncident }
  }, [incidents, invites])

  const liveTrackingActive = incidents.some((item) => item.status === 'ACTIVE')

  const greeting = useMemo(() => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good morning'
    if (hour < 17) return 'Good afternoon'
    return 'Good evening'
  }, [])

  const recentActivity = useMemo(() => {
    const incidentActivity = incidents.slice(0, 4).map((incident) => ({
      id: `incident-${incident.id}`,
      title:
        incident.status === 'ACTIVE'
          ? `SOS triggered (Incident #${incident.id})`
          : incident.status === 'RESOLVED'
            ? `Incident #${incident.id} resolved by ${incident.resolvedByRole?.toLowerCase() ?? 'system'}`
            : `Incident #${incident.id} updated`,
      timestamp: incident.updatedAt,
      tone: (incident.status === 'ACTIVE' ? 'danger' : incident.status === 'RESOLVED' ? 'safe' : 'neutral') as ActivityTone,
    }))

    const inviteActivity = invites.slice(0, 4).map((invite) => ({
      id: `invite-${invite.id}`,
      title: `Guardian invite ${invite.status.toLowerCase()} (${invite.guardianName})`,
      timestamp: invite.updatedAt,
      tone: (invite.status === 'ACCEPTED' ? 'safe' : invite.status === 'PENDING' ? 'warning' : 'neutral') as ActivityTone,
    }))

    return [...incidentActivity, ...inviteActivity]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 6)
  }, [incidents, invites])

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-[var(--color-brand-border)] bg-[var(--color-brand-dark)] p-5">
        <h2 className="text-2xl font-semibold text-[var(--color-brand-text)]">
          {greeting}, {user?.name ?? 'User'}
        </h2>
        <p className="mt-1 text-sm text-[var(--color-brand-muted)]">Your safety status is active.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <StatusBadge label={`Location Services ${isLocationAvailable ? 'Active' : 'Inactive'}`} tone={isLocationAvailable ? 'safe' : 'warning'} />
          <StatusBadge label={`Guardians Connected: ${stats.connectedGuardians}`} tone={stats.connectedGuardians ? 'safe' : 'warning'} />
          <StatusBadge label={stats.active ? `${stats.active} Active Emergency` : 'No Active Emergency'} tone={stats.active ? 'danger' : 'safe'} />
        </div>
      </section>
      {error ? <InlineAlert message={error} /> : null}

      <section className="grid gap-4 xl:grid-cols-2">
        <article className="rounded-xl border border-[#42302d] bg-[var(--color-brand-dark)] p-5">
          <p className="text-lg font-semibold text-[var(--color-brand-text)]">Emergency SOS</p>
          <p className="mt-1 text-sm text-[var(--color-brand-muted)]">Trigger SOS, share your live location, and notify your guardians.</p>
          <button
            className="mt-4 w-full rounded-lg bg-[var(--color-brand-pink)] px-4 py-3 text-sm font-semibold text-white hover:brightness-95"
            onClick={() => navigate('/dashboard/user/sos')}
            type="button"
          >
            TRIGGER SOS
          </button>
          <dl className="mt-4 grid gap-2 text-sm text-[var(--color-brand-muted)] sm:grid-cols-3">
            <div>
              <dt className="text-xs uppercase">Location</dt>
              <dd className="text-[var(--color-brand-text)]">{isLocationAvailable ? 'Current location available' : 'Location unavailable'}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase">Live Tracking</dt>
              <dd className="text-[var(--color-brand-text)]">{liveTrackingActive ? 'Active' : 'Inactive'}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase">Guardians</dt>
              <dd className="text-[var(--color-brand-text)]">{stats.connectedGuardians} connected</dd>
            </div>
          </dl>
        </article>

        <article className="rounded-xl border border-[var(--color-brand-border)] bg-[var(--color-brand-dark)] p-5">
          <p className="text-lg font-semibold text-[var(--color-brand-text)]">Safety Status</p>
          <div className="mt-3 space-y-2 text-sm">
            <p className="flex items-center justify-between"><span className="text-[var(--color-brand-muted)]">Location</span><span>{isLocationAvailable ? 'Active' : 'Inactive'}</span></p>
            <p className="flex items-center justify-between"><span className="text-[var(--color-brand-muted)]">GPS Accuracy</span><span>{isLocationAvailable ? 'Available' : 'N/A'}</span></p>
            <p className="flex items-center justify-between"><span className="text-[var(--color-brand-muted)]">Live Tracking</span><span>{liveTrackingActive ? 'Active' : 'Inactive'}</span></p>
            <p className="flex items-center justify-between"><span className="text-[var(--color-brand-muted)]">Last Updated</span><span>{locationCheckedAt ? new Date(locationCheckedAt).toLocaleString() : '-'}</span></p>
          </div>
        </article>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <article className="rounded-xl border border-[var(--color-brand-border)] bg-[var(--color-brand-dark)] p-5">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-lg font-semibold text-[var(--color-brand-text)]">Guardian Summary</p>
              <p className="text-sm text-[var(--color-brand-muted)]">{stats.connectedGuardians} connected</p>
            </div>
            <Link
              className="rounded-md border border-[var(--color-brand-border)] bg-white px-3 py-1 text-xs font-semibold text-[var(--color-brand-pink)] hover:bg-[var(--color-brand-pink-light)]"
              to="/dashboard/user/guardians"
            >
              View Guardians
            </Link>
          </div>
          <div className="mt-3 space-y-2">
            {(invites.length ? invites : []).slice(0, 3).map((invite) => (
              <div className="rounded-lg border border-[var(--color-brand-border)] bg-[var(--color-brand-black-soft)] p-3 text-sm" key={invite.id}>
                <p className="font-medium text-[var(--color-brand-text)]">{invite.guardianName}</p>
                <p className="text-[var(--color-brand-muted)]">{invite.guardianEmail}</p>
                <div className="mt-2">
                  <StatusBadge
                    label={invite.status}
                    tone={invite.status === 'ACCEPTED' ? 'safe' : invite.status === 'PENDING' ? 'warning' : 'neutral'}
                  />
                </div>
              </div>
            ))}
            {!invites.length ? <p className="text-sm text-[var(--color-brand-muted)]">No guardians invited yet.</p> : null}
          </div>
        </article>

        <article className="rounded-xl border border-[var(--color-brand-border)] bg-[var(--color-brand-dark)] p-5">
          <div className="flex items-center justify-between gap-2">
            <p className="text-lg font-semibold text-[var(--color-brand-text)]">Incident Summary</p>
            <Link
              className="rounded-md border border-[var(--color-brand-border)] bg-white px-3 py-1 text-xs font-semibold text-[var(--color-brand-pink)] hover:bg-[var(--color-brand-pink-light)]"
              to="/dashboard/user/incidents"
            >
              View All Incidents
            </Link>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-md border border-[var(--color-brand-border)] bg-[var(--color-brand-black-soft)] p-2">
              <p className="text-[11px] text-[var(--color-brand-muted)]">Active</p>
              <p className="text-lg font-semibold text-[var(--color-brand-pink)]">{stats.active}</p>
            </div>
            <div className="rounded-md border border-[var(--color-brand-border)] bg-[var(--color-brand-black-soft)] p-2">
              <p className="text-[11px] text-[var(--color-brand-muted)]">Resolved</p>
              <p className="text-lg font-semibold text-[var(--color-brand-pink)]">{stats.resolved}</p>
            </div>
            <div className="rounded-md border border-[var(--color-brand-border)] bg-[var(--color-brand-black-soft)] p-2">
              <p className="text-[11px] text-[var(--color-brand-muted)]">Total</p>
              <p className="text-lg font-semibold text-[var(--color-brand-text)]">{stats.totalIncidents}</p>
            </div>
          </div>
          {stats.latestIncident ? (
            <div className="mt-3 rounded-lg border border-[var(--color-brand-border)] bg-[var(--color-brand-black-soft)] p-3 text-sm">
              <p className="font-medium text-[var(--color-brand-text)]">{stats.latestIncident.title}</p>
              <p className="text-[var(--color-brand-muted)]">Incident #{stats.latestIncident.id}</p>
              <div className="mt-2">
                <StatusBadge
                  label={stats.latestIncident.status}
                  tone={stats.latestIncident.status === 'ACTIVE' ? 'danger' : stats.latestIncident.status === 'RESOLVED' ? 'safe' : 'neutral'}
                />
              </div>
              <p className="mt-2 text-[var(--color-brand-muted)]">{new Date(stats.latestIncident.createdAt).toLocaleString()}</p>
            </div>
          ) : (
            <p className="mt-3 text-sm text-[var(--color-brand-muted)]">No incidents recorded yet.</p>
          )}
        </article>
      </section>

      <section className="rounded-xl border border-[var(--color-brand-border)] bg-[var(--color-brand-dark)] p-5">
        <p className="text-lg font-semibold text-[var(--color-brand-text)]">Recent Activity</p>
        <div className="mt-3 space-y-2">
          {recentActivity.length ? (
            recentActivity.map((activity) => (
              <div className="flex items-center justify-between gap-2 rounded-md border border-[var(--color-brand-border)] bg-[var(--color-brand-black-soft)] p-3 text-sm" key={activity.id}>
                <div className="flex items-center gap-2">
                  <StatusBadge label={activity.title} tone={activity.tone} />
                </div>
                <span className="text-xs text-[var(--color-brand-muted)]">{new Date(activity.timestamp).toLocaleString()}</span>
              </div>
            ))
          ) : (
            <p className="text-sm text-[var(--color-brand-muted)]">No activity yet.</p>
          )}
        </div>
      </section>
    </div>
  )
}
