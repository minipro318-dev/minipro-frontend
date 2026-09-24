import { Link } from 'react-router-dom'

type AuthSwitchTextProps = {
  text: string
  linkText: string
  to: string
}

export const AuthSwitchText = ({ text, linkText, to }: AuthSwitchTextProps) => (
  <p className="text-center text-sm text-brand-muted">
    {text}{' '}
    <Link className="text-brand-peach hover:underline" to={to}>
      {linkText}
    </Link>
  </p>
)
