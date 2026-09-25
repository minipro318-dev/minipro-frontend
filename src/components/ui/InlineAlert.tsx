type InlineAlertProps = {
  message: string
}

export const InlineAlert = ({ message }: InlineAlertProps) => (
  <p className="rounded-md border border-[var(--color-brand-border)] bg-[var(--color-brand-pink-light)] px-3 py-2 text-sm text-[var(--color-brand-pink)]">
    {message}
  </p>
)
