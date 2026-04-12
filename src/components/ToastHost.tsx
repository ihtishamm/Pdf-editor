import { X } from 'lucide-react'
import { usePdfEditorStore } from '../store/pdfEditorStore'

export function ToastHost() {
  const toastMessage = usePdfEditorStore((s) => s.toastMessage)
  const dismissToast = usePdfEditorStore((s) => s.dismissToast)

  if (!toastMessage) return null

  return (
    <div
      className="fixed bottom-8 left-1/2 z-[400] max-w-md -translate-x-1/2 animate-slide-up rounded-card border border-ring bg-surface px-4 py-3 text-sm shadow-elevated"
      role="status"
    >
      <div className="flex items-start gap-3">
        <p className="flex-1 font-medium text-near-black">{toastMessage}</p>
        <button
          type="button"
          onClick={() => dismissToast()}
          className="shrink-0 rounded-btn p-0.5 text-placeholder transition-colors hover:text-near-black"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
