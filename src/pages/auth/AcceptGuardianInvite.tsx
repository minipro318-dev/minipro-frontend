import { useMemo, useState, type FormEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { guardianInviteApi } from '../../services/guardian-invite.api'
import { useAuth } from '../../hooks/useAuth'
import { isStrongPassword, isValidEmail } from '../../utils/validation'
import { AuthSwitchText, FormField, InlineAlert, PrimaryButton, TextInput } from '../../components/ui'

export const AcceptGuardianInvite = () => {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [searchParams] = useSearchParams()
  const inviteCodeFromUrl = useMemo(() => searchParams.get('code') || '', [searchParams])

  const [inviteCode, setInviteCode] = useState(inviteCodeFromUrl)
  const [guardianName, setGuardianName] = useState('')
  const [guardianEmail, setGuardianEmail] = useState('')
  const [guardianMobile, setGuardianMobile] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')

    const code = inviteCode.trim().toUpperCase()
    const email = guardianEmail.trim().toLowerCase()
    const name = guardianName.trim()
    const mobile = guardianMobile.trim()

    if (!code || !name || !email || !mobile || !password || !confirmPassword) {
      setError('Please fill all required fields.')
      return
    }

    if (!isValidEmail(email)) {
      setError('Please enter a valid email address.')
      return
    }

    if (!isStrongPassword(password)) {
      setError('Password must be at least 8 chars with uppercase, lowercase and number.')
      return
    }

    if (password !== confirmPassword) {
      setError('Password and confirm password do not match.')
      return
    }

    try {
      setLoading(true)
      const result = await guardianInviteApi.accept({
        inviteCode: code,
        guardianName: name,
        guardianEmail: email,
        guardianMobile: mobile,
        password,
        confirmPassword,
      })
      login(result)
      navigate('/dashboard/guardian', { replace: true })
    } catch (apiError) {
      const apiMessage =
        typeof apiError === 'object' && apiError && 'message' in apiError && typeof apiError.message === 'string'
          ? apiError.message
          : 'Could not accept guardian invite. Please verify details and retry.'
      setError(apiMessage)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form className="space-y-4" onSubmit={onSubmit}>
      <h2 className="text-center text-xl font-semibold text-brand-pink">Accept Guardian Invite</h2>
      <FormField id="inviteCode" label="Invite Code">
        <TextInput id="inviteCode" onChange={(event) => setInviteCode(event.target.value)} placeholder="ENTER CODE" value={inviteCode} />
      </FormField>
      <FormField id="guardianName" label="Full Name">
        <TextInput id="guardianName" onChange={(event) => setGuardianName(event.target.value)} placeholder="Enter your name" value={guardianName} />
      </FormField>
      <FormField id="guardianEmail" label="Email">
        <TextInput
          id="guardianEmail"
          onChange={(event) => setGuardianEmail(event.target.value)}
          placeholder="you@example.com"
          type="email"
          value={guardianEmail}
        />
      </FormField>
      <FormField id="guardianMobile" label="Mobile Number">
        <TextInput id="guardianMobile" onChange={(event) => setGuardianMobile(event.target.value)} placeholder="9876543210" value={guardianMobile} />
      </FormField>
      <FormField id="password" label="Create Password">
        <TextInput id="password" onChange={(event) => setPassword(event.target.value)} placeholder="StrongPass1" type="password" value={password} />
      </FormField>
      <FormField id="confirmPassword" label="Confirm Password">
        <TextInput
          id="confirmPassword"
          onChange={(event) => setConfirmPassword(event.target.value)}
          placeholder="StrongPass1"
          type="password"
          value={confirmPassword}
        />
      </FormField>
      {error ? <InlineAlert message={error} /> : null}
      <PrimaryButton disabled={loading} type="submit">
        {loading ? 'Accepting Invite...' : 'Accept Invite & Create Guardian Account'}
      </PrimaryButton>
      <AuthSwitchText linkText="Login" text="Already have an account?" to="/login" />
    </form>
  )
}
