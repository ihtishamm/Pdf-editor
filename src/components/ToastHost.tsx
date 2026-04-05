import { usePdfEditorStore } from '../store/pdfEditorStore'

export function ToastHost() {
  const toastMessage = usePdfEditorStore((s) => s.toastMessage)
  const dismissToast = usePdfEditorStore((s) => s.dismissToast)

  if (!toastMessage) return null

  return (
    <div
      className="fixed bottom-24 left-1/2 z-[400] max-w-md -translate-x-1/2 rounded-lg border border-[#e0e0e0] bg-white px-4 py-3 text-sm text-[#333] shadow-lg"
      role="status"
    >
      <div className="flex items-start gap-3">
        <p className="flex-1">{toastMessage}</p>
        <button
          type="button"
          onClick={() => dismissToast()}
          className="shrink-0 text-[#888] hover:text-[#333]"
          aria-label="Dismiss"
        >
          ×
        </button>
      </div>
    </div>
  )
}
