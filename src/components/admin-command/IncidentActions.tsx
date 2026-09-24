import { useState } from 'react'

type IncidentActionsProps = {
  incidentId: number
  status: string
  onResolve: (incidentId: number) => Promise<void>
  onCancel: (incidentId: number) => Promise<void>
}

type ConfirmState = { type: 'resolve' | 'cancel'; open: boolean }

export const IncidentActions = ({ incidentId, status, onResolve, onCancel }: IncidentActionsProps) => {
  const [confirm, setConfirm] = useState<ConfirmState>({ type: 'resolve', open: false })
  const normalized = status.toUpperCase()

  if (normalized !== 'ACTIVE' && normalized !== 'PENDING') {
    return <p className="text-xs text-[#A8A29E]">Final status: {normalized}</p>
  }

  const openConfirm = (type: 'resolve' | 'cancel') => setConfirm({ type, open: true })

  const closeConfirm = () => setConfirm((previous) => ({ ...previous, open: false }))

  const runAction = async () => {
    if (confirm.type === 'resolve') {
      await onResolve(incidentId)
    } else {
      await onCancel(incidentId)
    }
    closeConfirm()
  }

  return (
    <>
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          className="rounded-lg bg-[#F2A093] px-3 py-2 text-sm font-semibold text-[#241916] hover:brightness-95"
          onClick={() => openConfirm('resolve')}
          type="button"
        >
          Resolve
        </button>
        <button
          className="rounded-lg border border-[#3a3a3a] bg-[#161616] px-3 py-2 text-sm text-[#F7E8E4] hover:bg-[#202020]"
          onClick={() => openConfirm('cancel')}
          type="button"
        >
          Cancel
        </button>
      </div>

      {confirm.open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4">
          <div className="w-full max-w-md rounded-xl border border-[#2d2d2d] bg-[#111111] p-5">
            <p className="text-lg font-semibold text-[#F7E8E4]">
              {confirm.type === 'resolve' ? `Resolve incident #${incidentId}?` : `Cancel incident #${incidentId}?`}
            </p>
            <p className="mt-2 text-sm text-[#A8A29E]">
              {confirm.type === 'resolve'
                ? 'This will mark the incident as resolved.'
                : 'This will mark the incident as cancelled.'}
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                className="rounded-lg border border-[#363636] px-3 py-2 text-sm text-[#F7E8E4] hover:bg-[#1b1b1b]"
                onClick={closeConfirm}
                type="button"
              >
                Keep Active
              </button>
              <button
                className="rounded-lg bg-[#F2A093] px-3 py-2 text-sm font-semibold text-[#241916] hover:brightness-95"
                onClick={() => void runAction()}
                type="button"
              >
                {confirm.type === 'resolve' ? 'Resolve Incident' : 'Cancel Incident'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}

