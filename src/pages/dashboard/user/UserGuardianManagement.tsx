import { useEffect, useState, type FormEvent } from 'react'
import { StatusBadge } from '../../../components/common/StatusBadge'
import { FormField, InlineAlert, TextInput } from '../../../components/ui'
import { useAuth } from '../../../hooks/useAuth'
import { guardianInviteApi } from '../../../services/guardian-invite.api'
import type { GuardianInvite } from '../../../types/guardian-invite.types'
import { isValidEmail } from '../../../utils/validation'

type BadgeTone = 'safe' | 'warning' | 'danger' | 'neutral'

export const UserGuardianManagement = () => {
  const { token } = useAuth()
  const [guardianInvites, setGuardianInvites] = useState<GuardianInvite[]>([])
  const [guardianName, setGuardianName] = useState('')
  const [guardianEmail, setGuardianEmail] = useState('')
  const [guardianMobile, setGuardianMobile] = useState('')
  const [inviteLoading, setInviteLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const loadGuardianInvites = async () => {
    if (!token) return
    const data = await guardianInviteApi.list(token)
    setGuardianInvites(data.invites)
  }

  useEffect(() => {
    const run = async () => {
      try {
        await loadGuardianInvites()
      } catch (apiError) {
        const apiMessage =
          typeof apiError === 'object' && apiError && 'message' in apiError && typeof apiError.message === 'string'
            ? apiError.message
            : 'Could not load guardian invites.'
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
      await loadGuardianInvites()
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

  return (
    <div className="mx-auto w-full max-w-3xl space-y-4">
      <section className="rounded-xl border border-[#2a2a2a] bg-[#111111] p-5">
        <h2 className="text-2xl font-semibold text-[#F7E8E4]">Guardians</h2>
        <p className="mt-1 text-sm text-[#A8A29E]">Manage trusted contacts who receive your emergency alerts.</p>
      </section>

      <form className="space-y-3 rounded-xl border border-[#2a2a2a] bg-[#111111] p-5" onSubmit={onCreateGuardianInvite}>
        <h3 className="text-lg font-semibold text-[#F7E8E4]">Add Guardian</h3>
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
        {error ? <InlineAlert message={error} /> : null}
        {message ? <p className="rounded-md border border-emerald-500/60 bg-emerald-950/40 px-3 py-2 text-sm text-emerald-200">{message}</p> : null}
        <button
          className="rounded-md bg-[#F2A093] px-4 py-2 text-sm font-semibold text-black transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70"
          disabled={inviteLoading}
          type="submit"
        >
          {inviteLoading ? 'Sending Invite...' : 'Send Guardian Invite'}
        </button>
      </form>

      <section className="space-y-2 rounded-xl border border-[#2a2a2a] bg-[#111111] p-5">
        <h3 className="text-lg font-semibold text-[#F7E8E4]">Invite History</h3>
        {guardianInvites.length ? (
          <div className="space-y-2">
            {guardianInvites.map((invite) => {
              const inviteTone: BadgeTone =
                invite.status === 'ACCEPTED' ? 'safe' : invite.status === 'PENDING' ? 'warning' : 'neutral'
              const inviteLabel = invite.status === 'CANCELLED' ? 'DECLINED' : invite.status
              return (
                <article className="rounded-lg border border-[#2a2a2a] bg-[#161616] p-3 text-sm" key={invite.id}>
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-medium text-[#F7E8E4]">{invite.guardianName}</p>
                      <p className="text-[#A8A29E]">{invite.guardianEmail} • {invite.guardianMobile}</p>
                    </div>
                    <StatusBadge label={inviteLabel} tone={inviteTone} />
                  </div>
                  <div className="mt-2 grid gap-2 text-xs text-[#A8A29E] sm:grid-cols-2">
                    <p>
                      Invite code: <span className="font-semibold text-[#F7E8E4]">{invite.inviteCode}</span>
                    </p>
                    <p>Expiry: {new Date(invite.expiresAt).toLocaleString()}</p>
                  </div>
                </article>
              )
            })}
          </div>
        ) : (
          <p className="text-sm text-[#A8A29E]">No guardian invites yet.</p>
        )}
      </section>
    </div>
  )
}
