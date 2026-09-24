export const GuardianSupport = () => (
  <div className="space-y-4">
    <section className="rounded-xl border border-[#2a2a2a] bg-[#111111] p-5">
      <h2 className="text-2xl font-semibold text-[#F7E8E4]">Help &amp; Support</h2>
      <p className="mt-1 text-sm text-[#A8A29E]">Get help with guardian dashboard usage and emergency monitoring guidance.</p>
    </section>
    <section className="grid gap-3 md:grid-cols-2">
      <article className="rounded-xl border border-[#2a2a2a] bg-[#111111] p-4">
        <h3 className="text-sm font-semibold text-[#F7E8E4]">Monitoring Guidance</h3>
        <p className="mt-2 text-sm text-[#A8A29E]">
          Keep this dashboard accessible to quickly monitor incident status and location updates from linked users.
        </p>
      </article>
      <article className="rounded-xl border border-[#2a2a2a] bg-[#111111] p-4">
        <h3 className="text-sm font-semibold text-[#F7E8E4]">Escalation</h3>
        <p className="mt-2 text-sm text-[#A8A29E]">If an incident is active, contact local emergency services immediately as appropriate.</p>
      </article>
    </section>
  </div>
)

