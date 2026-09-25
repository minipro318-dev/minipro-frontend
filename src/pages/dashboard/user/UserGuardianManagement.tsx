import { useEffect, useState, type FormEvent } from 'react'
import { StatusBadge } from '../../../components/common/StatusBadge'
import { FormField, InlineAlert, TextInput } from '../../../components/ui'
import { useAuth } from '../../../hooks/useAuth'
import { guardianInviteApi } from '../../../services/guardian-invite.api'
import type { GuardianInvite, LinkedGuardian } from '../../../types/guardian-invite.types'
import { isValidEmail } from '../../../utils/validation'

type BadgeTone = 'safe' | 'warning' | 'danger' | 'neutral'

export const UserGuardianManagement = () => {
  const { token } = useAuth()
  const [guardianInvites, setGuardianInvites] = useState<GuardianInvite[]>([])
  const [linkedGuardians, setLinkedGuardians] = useState<LinkedGuardian[]>([])
  const [guardianName, setGuardianName] = useState('')
  const [guardianEmail, setGuardianEmail] = useState('')
  const [guardianMobile, setGuardianMobile] = useState('')
  const [inviteLoading, setInviteLoading] = useState(false)
  const [savingEdit, setSavingEdit] = useState(false)
  const [deletingGuardianId, setDeletingGuardianId] = useState<number | null>(null)
  const [editingGuardianId, setEditingGuardianId] = useState<number | null>(null)
  const [editName, setEditName] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [editMobile, setEditMobile] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const loadGuardianData = async () => {
    if (!token) return
    const [inviteData, linkedData] = await Promise.all([
      guardianInviteApi.list(token),
      guardianInviteApi.listLinked(token),
    ])
    setGuardianInvites(inviteData.invites)
    setLinkedGuardians(linkedData.guardians)
  }

  useEffect(() => {
    const run = async () => {
      try {
        await loadGuardianData()
      } catch (apiError) {
        const apiMessage =
          typeof apiError === 'object' && apiError && 'message' in apiError && typeof apiError.message === 'string'
            ? apiError.message
            : 'Could not load guardian data.'
        setError(apiMessage)
      }
    }
    void run()
  }, [token])

  const onCreateGuardianInvite = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    setMessage('')
    if (!token) return

    const name = guardianName.trim()
    const email = guardianEmail.trim().toLowerCase()
    const mobile = guardianMobile.trim()

    if (!name || !email || !mobile) {
      setError('Guardian name, email and mobile are required.')
      return
    }
    if (!isValidEmail(email)) {
      setError('Please provide a valid guardian email.')
      return
    }

    try {
      setInviteLoading(true)
      const response = await guardianInviteApi.create(token, {
        guardianName: name,
        guardianEmail: email,
        guardianMobile: mobile,
      })
      setMessage(`Invite email sent to ${response.invite.guardianEmail}. Invite code: ${response.invite.inviteCode}`)
      setGuardianName('')
      setGuardianEmail('')
      setGuardianMobile('')
      await loadGuardianData()
    } catch (apiError) {
      const apiMessage =
        typeof apiError === 'object' && apiError && 'message' in apiError && typeof apiError.message === 'string'
          ? apiError.message
          : 'Failed to create guardian invite.'
      setError(apiMessage)
    } finally {
      setInviteLoading(false)
    }
  }

  const startEditing = (guardian: LinkedGuardian) => {
    setEditingGuardianId(guardian.id)
    setEditName(guardian.name)
    setEditEmail(guardian.email)
    setEditMobile(guardian.mobile ?? '')
  }

  const cancelEditing = () => {
    setEditingGuardianId(null)
    setEditName('')
    setEditEmail('')
    setEditMobile('')
  }

  const onUpdateLinkedGuardian = async (guardianId: number) => {
    if (!token) return
    setError('')
    setMessage('')

    const name = editName.trim()
    const email = editEmail.trim().toLowerCase()
    const mobile = editMobile.trim()

    if (!name && !email && !mobile) {
      setError('Provide at least one guardian field to update.')
      return
    }
    if (email && !isValidEmail(email)) {
      setError('Please provide a valid guardian email.')
      return
    }

    try {
      setSavingEdit(true)
      const response = await guardianInviteApi.updateLinked(token, guardianId, {
        guardianName: name || undefined,
        guardianEmail: email || undefined,
        guardianMobile: mobile || undefined,
      })
      setLinkedGuardians((previous) =>
        previous.map((guardian) => (guardian.id === response.guardian.id ? response.guardian : guardian)),
      )
      setMessage(`Guardian ${response.guardian.name} updated successfully.`)
      cancelEditing()
    } catch (apiError) {
      const apiMessage =
        typeof apiError === 'object' && apiError && 'message' in apiError && typeof apiError.message === 'string'
          ? apiError.message
          : 'Failed to update linked guardian.'
      setError(apiMessage)
    } finally {
      setSavingEdit(false)
    }
  }

  const onDeleteLinkedGuardian = async (guardianId: number) => {
    if (!token) return
    setError('')
    setMessage('')
    try {
      await guardianInviteApi.removeLinked(token, guardianId)
      setLinkedGuardians((previous) => previous.filter((guardian) => guardian.id !== guardianId))
      setMessage('Guardian removed successfully.')
      setDeletingGuardianId(null)
      if (editingGuardianId === guardianId) {
        cancelEditing()
      }
    } catch (apiError) {
      const apiMessage =
        typeof apiError === 'object' && apiError && 'message' in apiError && typeof apiError.message === 'string'
          ? apiError.message
          : 'Failed to remove linked guardian.'
      setError(apiMessage)
    }
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-4">
      <section className="rounded-xl border border-[var(--color-brand-border)] bg-[var(--color-brand-dark)] p-5">
        <h2 className="text-2xl font-semibold text-[var(--color-brand-text)]">Guardians</h2>
        <p className="mt-1 text-sm text-[var(--color-brand-muted)]">Manage trusted contacts who receive your emergency alerts.</p>
      </section>

      {error ? <InlineAlert message={error} /> : null}
      {message ? <p className="rounded-md border border-[var(--color-brand-border)] bg-[var(--color-brand-pink-light)] px-3 py-2 text-sm text-[var(--color-brand-pink)]">{message}</p> : null}

      <form className="space-y-3 rounded-xl border border-[var(--color-brand-border)] bg-[var(--color-brand-dark)] p-5" onSubmit={onCreateGuardianInvite}>
        <h3 className="text-lg font-semibold text-[var(--color-brand-text)]">Add Guardian</h3>
        <FormField id="guardianName" label="Guardian Name">
          <TextInput
            id="guardianName"
            onChange={(event) => setGuardianName(event.target.value)}
            placeholder="Enter guardian full name"
            value={guardianName}
          />
        </FormField>
        <div className="grid gap-3 md:grid-cols-2">
          <FormField id="guardianEmail" label="Guardian Email">
            <TextInput
              id="guardianEmail"
              onChange={(event) => setGuardianEmail(event.target.value)}
              placeholder="guardian@example.com"
              type="email"
              value={guardianEmail}
            />
          </FormField>
          <FormField id="guardianMobile" label="Guardian Mobile">
            <TextInput
              id="guardianMobile"
              onChange={(event) => setGuardianMobile(event.target.value)}
              placeholder="9876543210"
              value={guardianMobile}
            />
          </FormField>
        </div>
        <button
          className="rounded-md bg-[var(--color-brand-pink)] px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70"
          disabled={inviteLoading}
          type="submit"
        >
          {inviteLoading ? 'Sending Invite...' : 'Send Guardian Invite'}
        </button>
      </form>

      <section className="space-y-2 rounded-xl border border-[var(--color-brand-border)] bg-[var(--color-brand-dark)] p-5">
        <h3 className="text-lg font-semibold text-[var(--color-brand-text)]">Linked Guardians</h3>
        {linkedGuardians.length ? (
          <div className="space-y-2">
            {linkedGuardians.map((guardian) => (
              <article className="rounded-lg border border-[var(--color-brand-border)] bg-[var(--color-brand-black-soft)] p-3 text-sm" key={guardian.id}>
                {editingGuardianId === guardian.id ? (
                  <div className="space-y-3">
                    <FormField id={`edit-name-${guardian.id}`} label="Guardian Name">
                      <TextInput id={`edit-name-${guardian.id}`} onChange={(event) => setEditName(event.target.value)} value={editName} />
                    </FormField>
                    <div className="grid gap-3 md:grid-cols-2">
                      <FormField id={`edit-email-${guardian.id}`} label="Guardian Email">
                        <TextInput
                          id={`edit-email-${guardian.id}`}
                          onChange={(event) => setEditEmail(event.target.value)}
                          type="email"
                          value={editEmail}
                        />
                      </FormField>
                      <FormField id={`edit-mobile-${guardian.id}`} label="Guardian Mobile">
                        <TextInput id={`edit-mobile-${guardian.id}`} onChange={(event) => setEditMobile(event.target.value)} value={editMobile} />
                      </FormField>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        className="rounded-md bg-[var(--color-brand-pink)] px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-70"
                        disabled={savingEdit}
                        onClick={() => void onUpdateLinkedGuardian(guardian.id)}
                        type="button"
                      >
                        {savingEdit ? 'Saving...' : 'Save'}
                      </button>
                      <button
                        className="rounded-md border border-[var(--color-brand-border)] bg-white px-3 py-1.5 text-xs font-semibold text-[var(--color-brand-pink)] hover:bg-[var(--color-brand-pink-light)]"
                        onClick={cancelEditing}
                        type="button"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="font-medium text-[var(--color-brand-text)]">{guardian.name}</p>
                        <p className="text-[var(--color-brand-muted)]">{guardian.email} • {guardian.mobile ?? 'No mobile'}</p>
                        <p className="mt-1 text-xs text-[var(--color-brand-muted)]">Linked on {new Date(guardian.linkedAt).toLocaleString()}</p>
                      </div>
                      <StatusBadge label={guardian.status ? 'ACTIVE' : 'INACTIVE'} tone={guardian.status ? 'safe' : 'neutral'} />
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        className="rounded-md border border-[var(--color-brand-border)] bg-white px-3 py-1.5 text-xs font-semibold text-[var(--color-brand-pink)] hover:bg-[var(--color-brand-pink-light)]"
                        onClick={() => startEditing(guardian)}
                        type="button"
                      >
                        Edit
                      </button>
                      <button
                        className="rounded-md border border-[var(--color-brand-pink)] bg-[var(--color-brand-pink-light)] px-3 py-1.5 text-xs font-semibold text-[var(--color-brand-pink)] hover:opacity-90"
                        onClick={() => setDeletingGuardianId(guardian.id)}
                        type="button"
                      >
                        Delete
                      </button>
                    </div>
                  </>
                )}
              </article>
            ))}
          </div>
        ) : (
          <p className="text-sm text-[var(--color-brand-muted)]">No guardians linked yet.</p>
        )}
      </section>

      <section className="space-y-2 rounded-xl border border-[var(--color-brand-border)] bg-[var(--color-brand-dark)] p-5">
        <h3 className="text-lg font-semibold text-[var(--color-brand-text)]">Invite History</h3>
        {guardianInvites.length ? (
          <div className="space-y-2">
            {guardianInvites.map((invite) => {
              const inviteTone: BadgeTone =
                invite.status === 'ACCEPTED' ? 'safe' : invite.status === 'PENDING' ? 'warning' : 'neutral'
              const inviteLabel = invite.status === 'CANCELLED' ? 'DECLINED' : invite.status
              return (
                <article className="rounded-lg border border-[var(--color-brand-border)] bg-[var(--color-brand-black-soft)] p-3 text-sm" key={invite.id}>
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-medium text-[var(--color-brand-text)]">{invite.guardianName}</p>
                      <p className="text-[var(--color-brand-muted)]">{invite.guardianEmail} • {invite.guardianMobile}</p>
                    </div>
                    <StatusBadge label={inviteLabel} tone={inviteTone} />
                  </div>
                  <div className="mt-2 grid gap-2 text-xs text-[var(--color-brand-muted)] sm:grid-cols-2">
                    <p>
                      Invite code: <span className="font-semibold text-[var(--color-brand-text)]">{invite.inviteCode}</span>
                    </p>
                    <p>Expiry: {new Date(invite.expiresAt).toLocaleString()}</p>
                  </div>
                </article>
              )
            })}
          </div>
        ) : (
          <p className="text-sm text-[var(--color-brand-muted)]">No guardian invites yet.</p>
        )}
      </section>

      {deletingGuardianId !== null ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-brand-black/65 p-4">
          <div className="w-full max-w-md rounded-xl border border-[var(--color-brand-border)] bg-[var(--color-brand-dark)] p-5">
            <h3 className="text-lg font-semibold text-[var(--color-brand-text)]">Remove linked guardian?</h3>
            <p className="mt-2 text-sm text-[var(--color-brand-muted)]">
              This will unlink this guardian from your account. You can invite them again later if needed.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                className="rounded-lg border border-[var(--color-brand-border)] px-3 py-2 text-sm text-[var(--color-brand-text)] hover:bg-[var(--color-brand-black-soft)]"
                onClick={() => setDeletingGuardianId(null)}
                type="button"
              >
                Keep Guardian
              </button>
              <button
                className="rounded-lg bg-[var(--color-brand-pink)] px-3 py-2 text-sm font-semibold text-white hover:opacity-90"
                onClick={() => void onDeleteLinkedGuardian(deletingGuardianId)}
                type="button"
              >
                Remove Guardian
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
