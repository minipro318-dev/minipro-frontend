type StatusTone = 'safe' | 'warning' | 'danger' | 'neutral'

type StatusBadgeProps = {
  label: string
  tone?: StatusTone
}

const toneClasses: Record<StatusTone, string> = {
  safe: 'border-[var(--color-brand-border)] bg-[var(--color-brand-pink-light)] text-[var(--color-brand-pink)]',
  warning: 'border-[var(--color-brand-border-soft)] bg-[var(--color-brand-pink-soft)] text-[var(--color-brand-salmon)]',
  danger: 'border-[var(--color-brand-pink)] bg-[var(--color-brand-pink)] text-white',
  neutral: 'border-[var(--color-brand-border)] bg-[var(--color-brand-black-soft)] text-[var(--color-brand-pink)]',
}

export const StatusBadge = ({ label, tone = 'neutral' }: StatusBadgeProps) => (
  <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${toneClasses[tone]}`}>
    {label}
  </span>
)
