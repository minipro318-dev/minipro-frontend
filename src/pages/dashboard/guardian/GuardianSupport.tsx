export const GuardianSupport = () => (
  <div className="space-y-4">
    <section className="rounded-xl border border-[var(--color-brand-border)] bg-[var(--color-brand-dark)] p-5">
      <h2 className="text-2xl font-semibold text-[var(--color-brand-text)]">Help &amp; Support</h2>
      <p className="mt-1 text-sm text-[var(--color-brand-muted)]">Get help with guardian dashboard usage and emergency monitoring guidance.</p>
    </section>
    <section className="grid gap-3 md:grid-cols-2">
      <article className="rounded-xl border border-[var(--color-brand-border)] bg-[var(--color-brand-dark)] p-4">
        <h3 className="text-sm font-semibold text-[var(--color-brand-text)]">Monitoring Guidance</h3>
        <p className="mt-2 text-sm text-[var(--color-brand-muted)]">
          Keep this dashboard accessible to quickly monitor incident status and location updates from linked users.
        </p>
      </article>
      <article className="rounded-xl border border-[var(--color-brand-border)] bg-[var(--color-brand-dark)] p-4">
        <h3 className="text-sm font-semibold text-[var(--color-brand-text)]">Escalation</h3>
        <p className="mt-2 text-sm text-[var(--color-brand-muted)]">If an incident is active, contact local emergency services immediately as appropriate.</p>
      </article>
    </section>
  </div>
)

