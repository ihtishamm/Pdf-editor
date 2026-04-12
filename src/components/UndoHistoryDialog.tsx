import {
  Eraser,
  Highlighter,
  Image,
  Link2,
  ListChecks,
  Pen,
  Shapes,
  Type,
  X,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { usePdfEditorStore } from '../store/pdfEditorStore'
import type { HistoryFabricType } from '../types/fabricHistory'

type UndoHistoryDialogProps = {
  open: boolean
  onClose: () => void
}

function formatTime(d: Date): string {
  const t = d instanceof Date ? d : new Date(d)
  return t.toLocaleTimeString(undefined, {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

function TypeIcon({ t }: { t: HistoryFabricType }) {
  const cls = 'h-4 w-4 shrink-0 text-muted'
  switch (t) {
    case 'text':
      return <Type className={cls} strokeWidth={1.75} aria-hidden />
    case 'signature':
      return <Pen className={cls} strokeWidth={1.75} aria-hidden />
    case 'image':
      return <Image className={cls} strokeWidth={1.75} aria-hidden />
    case 'shape':
      return <Shapes className={cls} strokeWidth={1.75} aria-hidden />
    case 'link':
      return <Link2 className={cls} strokeWidth={1.75} aria-hidden />
    case 'form':
      return <ListChecks className={cls} strokeWidth={1.75} aria-hidden />
    case 'whiteout':
      return <Eraser className={cls} strokeWidth={1.75} aria-hidden />
    case 'annotation':
    default:
      return <Highlighter className={cls} strokeWidth={1.75} aria-hidden />
  }
}

export function UndoHistoryDialog({ open, onClose }: UndoHistoryDialogProps) {
  const history = usePdfEditorStore((s) => s.history)
  const revertEntries = usePdfEditorStore((s) => s.revertEntries)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [busy, setBusy] = useState(false)

  const selectedCount = selected.size

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const onRevert = async () => {
    if (selectedCount === 0 || busy) return
    setBusy(true)
    try {
      await revertEntries([...selected])
      setSelected(new Set())
      onClose()
    } finally {
      setBusy(false)
    }
  }

  const list = useMemo(() => history, [history])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-4"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        className="flex max-h-[min(520px,85vh)] w-full max-w-md flex-col overflow-hidden rounded-lg border border-ring bg-surface shadow-elevated"
        role="dialog"
        aria-modal="true"
        aria-labelledby="undo-history-title"
      >
        <div className="flex shrink-0 items-center justify-between border-b border-ring px-4 py-3">
          <h2 id="undo-history-title" className="text-base font-semibold text-text">
            Undo changes
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-muted hover:bg-surface-alt"
            aria-label="Close"
          >
            <X className="h-5 w-5" strokeWidth={1.75} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          {list.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-placeholder">No changes yet.</p>
          ) : (
            <ul className="divide-y divide-ring">
              {list.map((e) => (
                <li key={e.id} className="flex items-center gap-3 px-3 py-2.5 hover:bg-surface-alt">
                  <input
                    type="checkbox"
                    checked={selected.has(e.id)}
                    onChange={() => toggle(e.id)}
                    className="h-4 w-4 shrink-0 rounded border-ring accent-primary"
                    aria-label={`Select ${e.label}`}
                  />
                  <TypeIcon t={e.type} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-text">{e.label}</div>
                    <div className="mt-0.5 flex flex-wrap gap-x-2 text-xs text-placeholder">
                      <span>{formatTime(e.timestamp)}</span>
                      <span>Page {e.pageNumber}</span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="shrink-0 border-t border-ring px-4 py-3">
          <button
            type="button"
            disabled={selectedCount === 0 || busy}
            onClick={() => void onRevert()}
            className="w-full rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? 'Reverting…' : 'Revert selected'}
          </button>
        </div>
      </div>
    </div>
  )
}
