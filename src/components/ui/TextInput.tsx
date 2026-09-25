import type { InputHTMLAttributes } from 'react'

type TextInputProps = InputHTMLAttributes<HTMLInputElement>

export const TextInput = ({ className, ...props }: TextInputProps) => (
  <input
    className={`w-full rounded-md border border-brand-border bg-white px-3 py-2 text-brand-text outline-none focus:border-brand-pink ${className || ''}`.trim()}
    {...props}
  />
)
