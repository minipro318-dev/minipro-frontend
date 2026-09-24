import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { authApi } from '../../services/auth.api'
import { guardianInviteApi } from '../../services/guardian-invite.api'
import type { UserRole } from '../../types/auth.types'
import { isStrongPassword, isValidEmail } from '../../utils/validation'
import { useAuth } from '../../hooks/useAuth'
import { AuthSwitchText, FormField, InlineAlert, PrimaryButton, SelectInput, TextInput } from '../../components/ui'

const roles: UserRole[] = ['END_USER', 'GUARDIAN', 'ADMIN']
const roleOptions = roles.map((role) => ({ label: role, value: role }))

export const Register = () => {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [mobile, setMobile] = useState('')
  const [role, setRole] = useState<UserRole>('END_USER')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [adminRegistrationKey, setAdminRegistrationKey] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')

    const trimmedName = name.trim()
    const trimmedEmail = email.trim().toLowerCase()

    if (trimmedName.length < 2) {
      setError('Name must be at least 2 characters.')
      return
    }

    if (!isValidEmail(trimmedEmail)) {
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

    if (role === 'ADMIN' && !adminRegistrationKey.trim()) {
      setError('Admin registration key is required for ADMIN role.')
      return
    }
    if (role === 'GUARDIAN' && !inviteCode.trim()) {
      setError('Invite code is required for GUARDIAN role.')
      return
    }
    if (role === 'GUARDIAN' && !mobile.trim()) {
      setError('Mobile is required for GUARDIAN role.')
      return
    }

    try {
      setLoading(true)
      const data =
        role === 'GUARDIAN'
          ? await guardianInviteApi.accept({
              inviteCode: inviteCode.trim().toUpperCase(),
              guardianName: trimmedName,
              guardianEmail: trimmedEmail,
              guardianMobile: mobile.trim(),
              password,
              confirmPassword,
            })
          : await authApi.register({
              name: trimmedName,
              email: trimmedEmail,
              mobile: mobile.trim() || undefined,
              role,
              password,
              confirmPassword,
              adminRegistrationKey: role === 'ADMIN' ? adminRegistrationKey.trim() : undefined,
            })
      login(data)
      const rolePath =
        data.user.role === 'ADMIN'
          ? '/dashboard/admin'
          : data.user.role === 'GUARDIAN'
            ? '/dashboard/guardian'
            : '/dashboard/user'
      navigate(rolePath, { replace: true })
    } catch (apiError) {
      const message =
        typeof apiError === 'object' &&
        apiError &&
        'message' in apiError &&
        typeof apiError.message === 'string'
          ? apiError.message
          : 'Registration failed. Please try again.'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form className="space-y-4" onSubmit={onSubmit}>
      <FormField id="name" label="Full Name">
        <TextInput
          id="name"
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter full name"
          value={name}
        />
      </FormField>
      <FormField id="email" label="Email">
        <TextInput
          id="email"
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          type="email"
          value={email}
        />
      </FormField>
      <FormField id="mobile" label="Mobile (optional)">
        <TextInput
          id="mobile"
          onChange={(e) => setMobile(e.target.value)}
          placeholder="9876543210"
          value={mobile}
        />
      </FormField>
      <FormField id="role" label="Role">
        <SelectInput
          id="role"
          onChange={(e) => setRole(e.target.value as UserRole)}
          options={roleOptions}
          value={role}
        />
      </FormField>
      {role === 'ADMIN' ? (
        <FormField id="adminRegistrationKey" label="Admin Registration Key">
          <TextInput
            id="adminRegistrationKey"
            onChange={(e) => setAdminRegistrationKey(e.target.value)}
            placeholder="Enter admin registration key"
            value={adminRegistrationKey}
          />
        </FormField>
      ) : null}
      {role === 'GUARDIAN' ? (
        <FormField id="inviteCode" label="Guardian Invite Code">
          <TextInput
            id="inviteCode"
            onChange={(e) => setInviteCode(e.target.value)}
            placeholder="Enter invite code from email"
            value={inviteCode}
          />
        </FormField>
      ) : null}
      <FormField id="password" label="Password">
        <TextInput
          id="password"
          onChange={(e) => setPassword(e.target.value)}
          placeholder="StrongPass1"
          type="password"
          value={password}
        />
      </FormField>
      <FormField id="confirmPassword" label="Confirm Password">
        <TextInput
          id="confirmPassword"
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="StrongPass1"
          type="password"
          value={confirmPassword}
        />
      </FormField>
      {error ? <InlineAlert message={error} /> : null}
      <PrimaryButton disabled={loading} type="submit">
        {loading ? 'Registering...' : 'Register'}
      </PrimaryButton>
      <AuthSwitchText linkText="Login" text="Already have an account?" to="/login" />
    </form>
  )
}
