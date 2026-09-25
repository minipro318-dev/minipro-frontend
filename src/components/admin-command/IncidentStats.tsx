import type { AdminIncidentSummary } from './types'

type IncidentStatsProps = {
  summary: AdminIncidentSummary
}

const cards = [
  { key: 'active', label: 'ACTIVE', tone: 'text-[#EF4444]', hint: 'Requires attention' },
  { key: 'pending', label: 'PENDING', tone: 'text-[#F59E0B]', hint: 'Awaiting response' },
  { key: 'resolved', label: 'RESOLVED', tone: 'text-[#22C55E]', hint: 'Completed incidents' },
  { key: 'total', label: 'TOTAL', tone: 'text-[var(--color-brand-text)]', hint: 'Overall incidents tracked' },
] as const

export const IncidentStats = ({ summary }: IncidentStatsProps) => (
  <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
    {cards.map((card) => (
      <article className="rounded-xl bg-[var(--color-brand-dark)] p-4 shadow-[0_5px_20px_rgba(0,0,0,0.2)]" key={card.key}>
        <p className="text-xs tracking-widest text-[var(--color-brand-muted)]">{card.label}</p>
        <p className={`mt-1 text-3xl font-semibold ${card.tone}`}>{summary[card.key]}</p>
        <p className="mt-1 text-xs text-[var(--color-brand-muted)]">{card.hint}</p>
      </article>
    ))}
  </section>
)

