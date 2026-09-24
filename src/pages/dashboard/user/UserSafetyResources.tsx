export const UserSafetyResources = () => (
  <div className="space-y-4">
    <section className="rounded-xl border border-[#2a2a2a] bg-[#111111] p-5">
      <h2 className="text-2xl font-semibold text-[#F7E8E4]">Safety Resources</h2>
      <p className="mt-2 text-sm text-[#A8A29E]">
        Keep these resources handy for emergency preparedness and quick response.
      </p>
    </section>

    <section className="grid gap-3 md:grid-cols-2">
      <article className="rounded-xl border border-[#2a2a2a] bg-[#111111] p-4">
        <h3 className="text-sm font-semibold text-[#F7E8E4]">Emergency Checklist</h3>
        <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-[#A8A29E]">
          <li>Keep phone battery above 30% whenever possible.</li>
          <li>Enable location services and mobile data.</li>
          <li>Share your route and ETA with trusted contacts.</li>
        </ul>
      </article>
      <article className="rounded-xl border border-[#2a2a2a] bg-[#111111] p-4">
        <h3 className="text-sm font-semibold text-[#F7E8E4]">Emergency Contacts</h3>
        <ul className="mt-2 space-y-1 text-sm text-[#A8A29E]">
          <li>National Emergency: 112</li>
          <li>Women Helpline: 1091</li>
          <li>Police Control Room: 100</li>
        </ul>
      </article>
    </section>
  </div>
)

