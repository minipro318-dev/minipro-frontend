import type { IncidentFilterState } from './types'

type IncidentFiltersProps = {
  filters: IncidentFilterState
  types: string[]
  onChange: (next: IncidentFilterState) => void
}

const statusOptions: IncidentFilterState['status'][] = ['ALL', 'ACTIVE', 'PENDING', 'RESOLVED', 'CANCELLED']

export const IncidentFilters = ({ filters, types, onChange }: IncidentFiltersProps) => {
  const setField = <K extends keyof IncidentFilterState>(field: K, value: IncidentFilterState[K]) => {
    onChange({ ...filters, [field]: value })
  }

  return (
    <section className="sticky top-0 z-20 rounded-xl bg-[var(--color-brand-dark)] p-3 shadow-[0_6px_24px_rgba(0,0,0,0.2)]">
      <div className="grid gap-3 md:grid-cols-12">
        <div className="md:col-span-3">
          <input
            className="w-full rounded-lg border border-[var(--color-brand-border)] bg-[var(--color-brand-black-soft)] px-3 py-2 text-sm text-[var(--color-brand-text)] outline-none placeholder:text-[#7a7573] focus:border-[var(--color-brand-pink)]"
            onChange={(event) => setField('search', event.target.value)}
            placeholder="Search by ID, user, location..."
            value={filters.search}
          />
        </div>

        <div className="flex flex-wrap gap-2 md:col-span-5">
          {statusOptions.map((status) => {
            const selected = filters.status === status
            return (
              <button
                className={`rounded-lg px-3 py-2 text-xs font-medium transition ${
                  selected
                    ? 'bg-[var(--color-brand-pink)] text-white'
                    : 'bg-[var(--color-brand-black-soft)] text-[var(--color-brand-text)] hover:bg-[var(--color-brand-pink-light)]'
                }`}
                key={status}
                onClick={() => setField('status', status)}
                type="button"
              >
                {status}
              </button>
            )
          })}
        </div>

        <div className="md:col-span-2">
          <select
            className="w-full rounded-lg border border-[var(--color-brand-border)] bg-[var(--color-brand-black-soft)] px-3 py-2 text-xs text-[var(--color-brand-text)] outline-none focus:border-[var(--color-brand-pink)]"
            onChange={(event) => setField('type', event.target.value)}
            value={filters.type}
          >
            <option value="ALL">All Types</option>
            {types.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>

        <div className="md:col-span-1">
          <input
            className="w-full rounded-lg border border-[var(--color-brand-border)] bg-[var(--color-brand-black-soft)] px-3 py-2 text-xs text-[var(--color-brand-text)] outline-none focus:border-[var(--color-brand-pink)]"
            onChange={(event) => setField('date', event.target.value)}
            type="date"
            value={filters.date}
          />
        </div>

        <div className="md:col-span-1">
          <select
            className="w-full rounded-lg border border-[var(--color-brand-border)] bg-[var(--color-brand-black-soft)] px-3 py-2 text-xs text-[var(--color-brand-text)] outline-none focus:border-[var(--color-brand-pink)]"
            onChange={(event) => setField('sort', event.target.value as IncidentFilterState['sort'])}
            value={filters.sort}
          >
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
          </select>
        </div>
      </div>
    </section>
  )
}
