type AdminHeaderProps = {
  activeCount: number
}

export const AdminHeader = ({ activeCount }: AdminHeaderProps) => (
  <header className="rounded-xl bg-[var(--color-brand-dark)] px-5 py-4 shadow-[0_8px_30px_rgba(0,0,0,0.25)]">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold text-[var(--color-brand-text)]">Incident Command Center</h1>
        <p className="text-sm text-[var(--color-brand-muted)]">Monitor, triage and manage emergency incidents</p>
      </div>
      <div className="flex items-center gap-3">
        <div className="rounded-lg bg-[var(--color-brand-black-soft)] px-3 py-2 text-right">
          <p className="text-[11px] uppercase tracking-wider text-[var(--color-brand-muted)]">Active Incidents</p>
          <p className="text-xl font-semibold text-[#EF4444]">{activeCount}</p>
        </div>
        <button
          aria-label="Notifications"
          className="rounded-lg bg-[var(--color-brand-black-soft)] px-3 py-2 text-sm text-[var(--color-brand-text)] hover:bg-[var(--color-brand-pink-light)]"
          type="button"
        >
          🔔
        </button>
        <button
          aria-label="Admin menu"
          className="rounded-lg bg-[var(--color-brand-black-soft)] px-3 py-2 text-sm text-[var(--color-brand-text)] hover:bg-[var(--color-brand-pink-light)]"
          type="button"
        >
          👤
        </button>
      </div>
    </div>
  </header>
)
