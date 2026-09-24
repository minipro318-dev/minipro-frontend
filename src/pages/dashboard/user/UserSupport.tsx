export const UserSupport = () => (
  <div className="space-y-4">
    <section className="rounded-xl border border-[#2a2a2a] bg-[#111111] p-5">
      <h2 className="text-2xl font-semibold text-[#F7E8E4]">Help &amp; Support</h2>
      <p className="mt-2 text-sm text-[#A8A29E]">If you need immediate assistance, use SOS first, then contact support channels below.</p>
    </section>

    <section className="grid gap-3 md:grid-cols-2">
      <article className="rounded-xl border border-[#2a2a2a] bg-[#111111] p-4">
        <h3 className="text-sm font-semibold text-[#F7E8E4]">Technical Support</h3>
        <p className="mt-2 text-sm text-[#A8A29E]">Use your registered organization support process for app access or account issues.</p>
      </article>
      <article className="rounded-xl border border-[#2a2a2a] bg-[#111111] p-4">
        <h3 className="text-sm font-semibold text-[#F7E8E4]">Emergency Guidance</h3>
        <p className="mt-2 text-sm text-[#A8A29E]">In danger, trigger SOS immediately so guardians and authorized responders are notified.</p>
      </article>
    </section>
  </div>
)

