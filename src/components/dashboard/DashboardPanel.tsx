type DashboardPanelProps = {
  title: string
  description: string
}

export const DashboardPanel = ({ title, description }: DashboardPanelProps) => (
  <section className="rounded-xl border border-brand-border bg-brand-dark p-5 shadow-brand-soft">
    <h2 className="text-2xl font-bold text-brand-pink">{title}</h2>
    <p className="mt-2 text-brand-muted">{description}</p>
  </section>
)
