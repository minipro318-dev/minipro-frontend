import type { ReactNode } from 'react'

type FormFieldProps = {
  id: string
  label: string
  children: ReactNode
}

export const FormField = ({ id, label, children }: FormFieldProps) => (
  <div>
    <label className="mb-1 block text-sm text-brand-muted" htmlFor={id}>
      {label}
    </label>
    {children}
  </div>
)
