import type { ButtonHTMLAttributes, ReactNode } from 'react'

type PrimaryButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode
}

export const PrimaryButton = ({ className, children, ...props }: PrimaryButtonProps) => (
  <button
    className={`w-full cursor-pointer rounded-md bg-brand-peach px-4 py-2 font-semibold text-brand-black hover:bg-brand-pink disabled:cursor-not-allowed disabled:opacity-70 ${className || ''}`.trim()}
    {...props}
  >
    {children}
  </button>
)
