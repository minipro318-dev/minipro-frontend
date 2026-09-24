type AdminHeaderProps = {
  activeCount: number
}

export const AdminHeader = ({ activeCount }: AdminHeaderProps) => (
  <header className="rounded-xl bg-[#111111] px-5 py-4 shadow-[0_8px_30px_rgba(0,0,0,0.25)]">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold text-[#F7E8E4]">Incident Command Center</h1>
        <p className="text-sm text-[#A8A29E]">Monitor, triage and manage emergency incidents</p>
      </div>
      <div className="flex items-center gap-3">
        <div className="rounded-lg bg-[#161616] px-3 py-2 text-right">
          <p className="text-[11px] uppercase tracking-wider text-[#A8A29E]">Active Incidents</p>
          <p className="text-xl font-semibold text-[#EF4444]">{activeCount}</p>
        </div>
        <button
          aria-label="Notifications"
          className="rounded-lg bg-[#161616] px-3 py-2 text-sm text-[#F7E8E4] hover:bg-[#1d1d1d]"
          type="button"
        >
          🔔
        </button>
        <button
          aria-label="Admin menu"
          className="rounded-lg bg-[#161616] px-3 py-2 text-sm text-[#F7E8E4] hover:bg-[#1d1d1d]"
          type="button"
        >
          👤
        </button>
      </div>
    </div>
  </header>
)

