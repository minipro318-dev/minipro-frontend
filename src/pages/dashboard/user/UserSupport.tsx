export const UserSupport = () => (
  <div className="space-y-4">
    <section className="rounded-xl border border-[var(--color-brand-border)] bg-[var(--color-brand-dark)] p-5">
      <h2 className="text-2xl font-semibold text-[var(--color-brand-text)]">Help &amp; Support</h2>
      <p className="mt-2 text-sm text-[var(--color-brand-muted)]">If you need immediate assistance, use SOS first, then contact support channels below.</p>
    </section>

    <section className="grid gap-3 md:grid-cols-2">
      <article className="rounded-xl border border-[var(--color-brand-border)] bg-[var(--color-brand-dark)] p-4">
        <h3 className="text-sm font-semibold text-[var(--color-brand-text)]">Technical Support</h3>
        <p className="mt-2 text-sm text-[var(--color-brand-muted)]">Use your registered organization support process for app access or account issues.</p>
      </article>
      <article className="rounded-xl border border-[var(--color-brand-border)] bg-[var(--color-brand-dark)] p-4">
        <h3 className="text-sm font-semibold text-[var(--color-brand-text)]">Emergency Guidance</h3>
        <p className="mt-2 text-sm text-[var(--color-brand-muted)]">In danger, trigger SOS immediately so guardians and authorized responders are notified.</p>
      </article>
    </section>
  </div>
)

