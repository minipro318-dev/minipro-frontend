import { useEffect, useMemo, useState } from 'react'
import { InlineAlert } from '../../../components/ui'
import { useAuth } from '../../../hooks/useAuth'
import { authApi } from '../../../services/auth.api'
import type { AdminEndUser } from '../../../types/auth.types'

export const AdminUsers = () => {
  const { token } = useAuth()
  const [users, setUsers] = useState<AdminEndUser[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const run = async () => {
      if (!token) return
      try {
        setLoading(true)
        setError('')
        const data = await authApi.listEndUsersWithGuardians(token)
        setUsers(data.users)
      } catch (apiError) {
        const message =
          typeof apiError === 'object' && apiError && 'message' in apiError && typeof apiError.message === 'string'
            ? apiError.message
            : 'Could not load end users.'
        setError(message)
      } finally {
        setLoading(false)
      }
    }
    void run()
  }, [token])

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return users
    return users.filter((user) => {
      const guardianText = user.linkedGuardians
        .map((guardian) => `${guardian.name} ${guardian.email} ${guardian.mobile ?? ''}`)
        .join(' ')
        .toLowerCase()
      return (
        user.name.toLowerCase().includes(query) ||
        user.email.toLowerCase().includes(query) ||
        (user.mobile ?? '').toLowerCase().includes(query) ||
        guardianText.includes(query)
      )
    })
  }, [users, search])

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-[var(--color-brand-border)] bg-[var(--color-brand-dark)] p-5">
        <h2 className="text-2xl font-semibold text-[var(--color-brand-text)]">Users</h2>
        <p className="mt-1 text-sm text-[var(--color-brand-muted)]">
          End users and their linked guardians for administrative monitoring.
        </p>
      </section>

      {error ? <InlineAlert message={error} /> : null}

      <section className="rounded-xl border border-[var(--color-brand-border)] bg-[var(--color-brand-dark)] p-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <article className="rounded-lg border border-[var(--color-brand-border)] bg-[var(--color-brand-black-soft)] p-3">
            <p className="text-sm text-[var(--color-brand-muted)]">Total End Users</p>
            <p className="text-2xl font-semibold text-[var(--color-brand-text)]">{users.length}</p>
          </article>
          <article className="rounded-lg border border-[var(--color-brand-border)] bg-[var(--color-brand-black-soft)] p-3">
            <p className="text-sm text-[var(--color-brand-muted)]">With Linked Guardians</p>
            <p className="text-2xl font-semibold text-[var(--color-brand-pink)]">
              {users.filter((user) => user.linkedGuardians.length > 0).length}
            </p>
          </article>
          <article className="rounded-lg border border-[var(--color-brand-border)] bg-[var(--color-brand-black-soft)] p-3">
            <p className="text-sm text-[var(--color-brand-muted)]">Total Linked Guardians</p>
            <p className="text-2xl font-semibold text-[var(--color-brand-pink)]">
              {users.reduce((sum, user) => sum + user.linkedGuardians.length, 0)}
            </p>
          </article>
        </div>
      </section>

      <section className="rounded-xl border border-[var(--color-brand-border)] bg-[var(--color-brand-dark)] p-4">
        <input
          className="w-full rounded-md border border-[var(--color-brand-border)] bg-[var(--color-brand-black-soft)] px-3 py-2 text-sm text-[var(--color-brand-text)] outline-none focus:border-[var(--color-brand-pink)]"
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search by user or guardian name/email/mobile..."
          value={search}
        />
      </section>

      <section className="rounded-xl border border-[var(--color-brand-border)] bg-[var(--color-brand-dark)] p-4">
        {loading ? (
          <p className="text-sm text-[var(--color-brand-muted)]">Loading users…</p>
        ) : filteredUsers.length ? (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-wider text-[var(--color-brand-muted)]">
                <tr>
                  <th className="pb-2">End User</th>
                  <th className="pb-2">Contact</th>
                  <th className="pb-2">Status</th>
                  <th className="pb-2">Linked Guardians</th>
                  <th className="pb-2">Created</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => (
                  <tr className="border-t border-[var(--color-brand-border)] align-top" key={user.id}>
                    <td className="py-3">
                      <p className="font-medium text-[var(--color-brand-text)]">{user.name}</p>
                      <p className="text-xs text-[var(--color-brand-muted)]">ID #{user.id}</p>
                    </td>
                    <td className="py-3 text-[var(--color-brand-muted)]">
                      <p>{user.email}</p>
                      <p>{user.mobile ?? 'No mobile'}</p>
                    </td>
                    <td className="py-3">
                      <span
                        className={`rounded-full px-2 py-1 text-xs font-semibold ${
                          user.status
                            ? 'bg-[var(--color-brand-pink-light)] text-[var(--color-brand-pink)]'
                            : 'bg-[var(--color-brand-black-soft)] text-[var(--color-brand-muted)]'
                        }`}
                      >
                        {user.status ? 'ACTIVE' : 'INACTIVE'}
                      </span>
                    </td>
                    <td className="py-3">
                      {user.linkedGuardians.length ? (
                        <div className="space-y-2">
                          {user.linkedGuardians.map((guardian) => (
                            <div
                              className="rounded-md border border-[var(--color-brand-border)] bg-[var(--color-brand-black-soft)] px-2 py-1.5"
                              key={guardian.id}
                            >
                              <p className="font-medium text-[var(--color-brand-text)]">{guardian.name}</p>
                              <p className="text-xs text-[var(--color-brand-muted)]">
                                {guardian.email}
                                {guardian.mobile ? ` • ${guardian.mobile}` : ''}
                              </p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-[var(--color-brand-muted)]">No linked guardians</p>
                      )}
                    </td>
                    <td className="py-3 text-[var(--color-brand-muted)]">{new Date(user.createdAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-[var(--color-brand-muted)]">No matching users found.</p>
        )}
      </section>
    </div>
  )
}
