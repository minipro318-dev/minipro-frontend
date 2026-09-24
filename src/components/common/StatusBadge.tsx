type StatusTone = 'safe' | 'warning' | 'danger' | 'neutral'

type StatusBadgeProps = {
  label: string
  tone?: StatusTone
}

const toneClasses: Record<StatusTone, string> = {
  safe: 'border-emerald-500/40 bg-emerald-950/40 text-emerald-200',
  warning: 'border-amber-500/40 bg-amber-950/40 text-amber-200',
  danger: 'border-red-500/40 bg-red-950/40 text-red-200',
  neutral: 'border-zinc-500/40 bg-zinc-900/60 text-zinc-200',
}

export const StatusBadge = ({ label, tone = 'neutral' }: StatusBadgeProps) => (
  <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${toneClasses[tone]}`}>
    {label}
  </span>
)

