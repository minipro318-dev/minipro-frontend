type InlineAlertProps = {
  message: string
}

export const InlineAlert = ({ message }: InlineAlertProps) => (
  <p className="rounded-md border border-red-500/60 bg-red-950/40 px-3 py-2 text-sm text-red-200">{message}</p>
)
