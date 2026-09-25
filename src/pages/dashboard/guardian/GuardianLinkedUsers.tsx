import { useMemo } from 'react'
import { StatusBadge } from '../../../components/common/StatusBadge'
import { getLinkedUsersFromIncidents } from '../../../components/guardian/guardian-data'
import { InlineAlert } from '../../../components/ui'
import { useAuth } from '../../../hooks/useAuth'
import { useIncidents } from '../../../hooks/useIncidents'

export const GuardianLinkedUsers = () => {
  const { token } = useAuth()
  const { incidents, loading, error } = useIncidents(token)

  const linkedUsers = useMemo(() => getLinkedUsersFromIncidents(incidents), [incidents])

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-[var(--color-brand-border)] bg-[var(--color-brand-dark)] p-5">
        <h2 className="text-2xl font-semibold text-[var(--color-brand-text)]">Linked Users</h2>
        <p className="mt-1 text-sm text-[var(--color-brand-muted)]">View safety status and recent activity for users linked to your guardian account.</p>
      </section>

      {error ? <InlineAlert message={error} /> : null}
      {loading ? (
        <section className="rounded-xl border border-[var(--color-brand-border)] bg-[var(--color-brand-dark)] p-4 text-sm text-[var(--color-brand-muted)]">Loading linked users…</section>
      ) : null}

      {!loading ? (
        linkedUsers.length ? (
          <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {linkedUsers.map((user) => (
              <article className="rounded-xl border border-[var(--color-brand-border)] bg-[var(--color-brand-dark)] p-4" key={user.id}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-[var(--color-brand-text)]">{user.name}</p>
                    <p className="text-xs text-[var(--color-brand-muted)]">Linked User</p>
                  </div>
                  <StatusBadge label={user.safetyStatus === 'SAFE' ? 'SAFE' : 'ACTIVE EMERGENCY'} tone={user.safetyStatus === 'SAFE' ? 'safe' : 'danger'} />
                </div>
                <div className="mt-3 space-y-1 text-xs text-[var(--color-brand-muted)]">
                  <p>
                    Last incident: <span className="text-[var(--color-brand-text)]">{user.lastIncidentAt ? new Date(user.lastIncidentAt).toLocaleString() : 'N/A'}</span>
                  </p>
                  <p>
                    Last activity: <span className="text-[var(--color-brand-text)]">{user.lastActivityAt ? new Date(user.lastActivityAt).toLocaleString() : 'N/A'}</span>
                  </p>
                </div>
              </article>
            ))}
          </section>
        ) : (
          <section className="rounded-xl border border-[var(--color-brand-border)] bg-[var(--color-brand-dark)] p-4 text-sm text-[var(--color-brand-muted)]">
            No linked-user incident activity is available yet.
          </section>
        )
      ) : null}
    </div>
  )
}

