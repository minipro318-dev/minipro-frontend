import type { InputHTMLAttributes } from 'react'

type TextInputProps = InputHTMLAttributes<HTMLInputElement>

export const TextInput = ({ className, ...props }: TextInputProps) => (
  <input
    className={`w-full rounded-md border border-brand-border bg-brand-black px-3 py-2 outline-none focus:border-brand-peach ${className || ''}`.trim()}
    {...props}
  />
)
