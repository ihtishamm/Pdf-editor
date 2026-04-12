import { Trash2, X } from 'lucide-react'
import { createPortal } from 'react-dom'
import { usePdfEditorStore } from '../store/pdfEditorStore'
import type { PdfLinkType } from '../types/pdfLinks'

type LinkPropertiesPopoverProps = {
  linkId: string | null
  /** Viewport coordinates for positioning near the link rect. */
  anchor: { x: number; y: number } | null
  onClose: () => void
}

const PANEL_W = 320
const PANEL_H = 280

function clampPopoverPosition(
  anchor: { x: number; y: number },
  vw: number,
  vh: number,
) {
  let left = anchor.x - PANEL_W / 2
  let top = anchor.y - PANEL_H / 2
  left = Math.min(Math.max(8, left), vw - PANEL_W - 8)
  top = Math.min(Math.max(8, top), vh - PANEL_H - 8)
  return { left, top }
}

const TYPE_OPTIONS: { id: PdfLinkType; label: string; placeholder: string }[] = [
  { id: 'url', label: 'Link to external URL', placeholder: 'https://…' },
  { id: 'email', label: 'Link to email address', placeholder: 'you@example.com' },
  { id: 'phone', label: 'Link to phone number', placeholder: '+1234567890' },
  { id: 'page', label: 'Link to internal page', placeholder: 'Page number' },
]

export function LinkPropertiesPopover({
  linkId,
  anchor,
  onClose,
}: LinkPropertiesPopoverProps) {
  const entry = usePdfEditorStore((s) =>
    linkId ? s.pdfLinks.find((l) => l.id === linkId) ?? null : null,
  )
  const updatePdfLink = usePdfEditorStore((s) => s.updatePdfLink)
  const removePdfLink = usePdfEditorStore((s) => s.removePdfLink)

  if (!linkId || !anchor || !entry) {
    return null
  }

  const vw = window.innerWidth
  const vh = window.innerHeight
  const pos = clampPopoverPosition(anchor, vw, vh)

  const handleTypeChange = (t: PdfLinkType) => {
    updatePdfLink(linkId, { linkType: t })
  }

  const handleValueChange = (value: string) => {
    updatePdfLink(linkId, { value })
  }

  const handleDelete = () => {
    removePdfLink(linkId)
    onClose()
  }

  const activeOption = TYPE_OPTIONS.find((o) => o.id === entry.linkType) ?? TYPE_OPTIONS[0]!

  return createPortal(
    <>
      <button
        type="button"
        className="fixed inset-0 z-[115] cursor-default bg-transparent"
        aria-label="Dismiss overlay"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-labelledby="link-props-title"
        className="fixed z-[120] w-[min(calc(100vw-16px),320px)] rounded-lg border border-ring bg-surface-alt p-4 shadow-elevated"
        style={{ left: pos.left, top: pos.top }}
      >
        <div className="mb-3 flex items-start justify-between gap-2">
          <h2 id="link-props-title" className="text-sm font-semibold text-text">
            Link Properties
          </h2>
          <button
            type="button"
            className="shrink-0 rounded p-1 text-muted hover:bg-surface-3"
            aria-label="Close"
            onClick={onClose}
          >
            <X className="h-4 w-4" strokeWidth={1.75} />
          </button>
        </div>

        <fieldset className="space-y-2 border-0 p-0">
          <legend className="sr-only">Link destination</legend>
          {TYPE_OPTIONS.map((opt) => (
            <label
              key={opt.id}
              className="flex cursor-pointer items-start gap-2 rounded px-1 py-1 text-sm hover:bg-surface-3"
            >
              <input
                type="radio"
                name="pdf-link-type"
                className="mt-1"
                checked={entry.linkType === opt.id}
                onChange={() => handleTypeChange(opt.id)}
              />
              <span className="text-text">{opt.label}</span>
            </label>
          ))}
        </fieldset>

        <div className="mt-3">
          {entry.linkType === 'page' ? (
            <label className="block">
              <span className="sr-only">{activeOption.label}</span>
              <input
                type="number"
                min={1}
                className="w-full rounded border border-ring bg-surface-3 px-2 py-2 text-sm text-text"
                placeholder={activeOption.placeholder}
                value={entry.value}
                onChange={(e) => handleValueChange(e.target.value)}
              />
            </label>
          ) : (
            <label className="block">
              <span className="sr-only">{activeOption.label}</span>
              <input
                type={entry.linkType === 'email' ? 'email' : 'text'}
                className="w-full rounded border border-ring bg-surface-3 px-2 py-2 text-sm text-text"
                placeholder={activeOption.placeholder}
                value={entry.value}
                onChange={(e) => handleValueChange(e.target.value)}
                autoComplete="off"
              />
            </label>
          )}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleDelete}
            className="inline-flex items-center gap-1.5 rounded border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive hover:bg-destructive/20"
          >
            <Trash2 className="h-4 w-4 shrink-0" strokeWidth={1.75} />
            Delete link
          </button>
          <button
            type="button"
            onClick={onClose}
            className="ml-auto rounded border border-ring bg-surface-3 px-3 py-2 text-sm text-text hover:bg-surface-3/80"
          >
            Close
          </button>
        </div>
      </div>
    </>,
    document.body,
  )
}
