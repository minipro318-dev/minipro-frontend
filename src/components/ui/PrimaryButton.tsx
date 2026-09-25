import type { ButtonHTMLAttributes, ReactNode } from 'react'

type PrimaryButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode
}

export const PrimaryButton = ({ className, children, ...props }: PrimaryButtonProps) => (
  <button
    className={`w-full cursor-pointer rounded-md bg-brand-pink px-4 py-2 font-semibold text-white hover:bg-brand-salmon active:bg-brand-salmon focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-pink/40 disabled:cursor-not-allowed disabled:bg-brand-pink-soft disabled:text-white/80 ${className || ''}`.trim()}
    {...props}
  >
    {children}
  </button>
)
