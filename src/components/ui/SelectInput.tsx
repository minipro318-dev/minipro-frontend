import type { SelectHTMLAttributes } from 'react'

type SelectOption = {
  label: string
  value: string
}

type SelectInputProps = SelectHTMLAttributes<HTMLSelectElement> & {
  options: SelectOption[]
}

export const SelectInput = ({ className, options, ...props }: SelectInputProps) => (
  <select
    className={`w-full rounded-md border border-brand-border bg-white px-3 py-2 text-brand-text outline-none focus:border-brand-pink ${className || ''}`.trim()}
    {...props}
  >
    {options.map((option) => (
      <option key={option.value} value={option.value}>
        {option.label}
      </option>
    ))}
  </select>
)
