export const UserSettings = () => (
  <div className="space-y-4">
    <section className="rounded-xl border border-[var(--color-brand-border)] bg-[var(--color-brand-dark)] p-5">
      <h2 className="text-2xl font-semibold text-[var(--color-brand-text)]">Settings</h2>
      <p className="mt-2 text-sm text-[var(--color-brand-muted)]">
        Settings controls will be expanded as more user-level preferences are connected.
      </p>
    </section>

    <section className="rounded-xl border border-[var(--color-brand-border)] bg-[var(--color-brand-dark)] p-4">
      <p className="text-sm text-[var(--color-brand-text)]">Notification preference</p>
      <p className="mt-1 text-xs text-[var(--color-brand-muted)]">Managed by your account/session settings from existing authentication flows.</p>
    </section>
  </div>
)

