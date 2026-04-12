import { Loader2 } from 'lucide-react'
import { usePdfEditorStore } from '../store/pdfEditorStore'

export function ExportingOverlay() {
  const isExporting = usePdfEditorStore((s) => s.isExporting)
  if (!isExporting) return null

  return (
    <div
      className="fixed inset-0 z-[350] flex flex-col items-center justify-center gap-4 bg-surface/85 backdrop-blur-sm"
      role="alert"
      aria-busy="true"
      aria-live="polite"
    >
      <Loader2
        className="h-10 w-10 animate-spin text-primary"
        strokeWidth={2}
        aria-hidden
      />
      <p className="font-display text-lg font-medium text-near-black">Applying changes…</p>
    </div>
  )
}
