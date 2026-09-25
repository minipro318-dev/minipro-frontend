import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { authApi } from '../../services/auth.api'
import { useAuth } from '../../hooks/useAuth'
import { isValidEmail } from '../../utils/validation'
import { AuthSwitchText, FormField, InlineAlert, PrimaryButton, TextInput } from '../../components/ui'

export const Login = () => {
  const navigate = useNavigate()
  const { login, homePath } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')

    const trimmedEmail = email.trim().toLowerCase()
    if (!isValidEmail(trimmedEmail)) {
      setError('Please enter a valid email address.')
      return
    }
    if (!password) {
      setError('Password is required.')
      return
    }

    try {
      setLoading(true)
      const data = await authApi.login(trimmedEmail, password)
      login(data)
      const rolePath =
        data.user.role === 'ADMIN'
          ? '/dashboard/admin'
          : data.user.role === 'GUARDIAN'
            ? '/dashboard/guardian'
            : '/dashboard/user'
      navigate(rolePath || homePath, { replace: true })
    } catch (apiError) {
      const message =
        typeof apiError === 'object' &&
        apiError &&
        'message' in apiError &&
        typeof apiError.message === 'string'
          ? apiError.message
          : 'Login failed. Please check your credentials.'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form className="space-y-5" onSubmit={onSubmit}>
      <FormField id="email" label="Email">
        <TextInput
          className="rounded-xl border-[var(--color-brand-border)] bg-white/95 px-4 py-2.5 text-[var(--color-brand-text)] shadow-sm transition focus:border-[var(--color-brand-pink)] focus:ring-2 focus:ring-[var(--color-brand-pink)]/20"
          id="email"
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          type="email"
          value={email}
        />
      </FormField>
      <FormField id="password" label="Password">
        <TextInput
          className="rounded-xl border-[var(--color-brand-border)] bg-white/95 px-4 py-2.5 text-[var(--color-brand-text)] shadow-sm transition focus:border-[var(--color-brand-pink)] focus:ring-2 focus:ring-[var(--color-brand-pink)]/20"
          id="password"
          onChange={(e) => setPassword(e.target.value)}
          placeholder="********"
          type="password"
          value={password}
        />
      </FormField>
      {error ? <InlineAlert message={error} /> : null}
      <PrimaryButton className="rounded-xl py-2.5 shadow-[0_10px_24px_rgba(205,22,119,0.3)]" disabled={loading} type="submit">
        {loading ? 'Logging in...' : 'Login'}
      </PrimaryButton>
      <div className="pt-1">
        <AuthSwitchText linkText="Register here" text="New user?" to="/register" />
      </div>
    </form>
  )
}
