import {
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Download,
  FileText,
  Printer,
  RotateCcw,
  Share2,
  Trash2,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { usePdfEditorStore } from '../store/pdfEditorStore'
import { Button } from './ui/Button'
import { ShareDocumentModal } from './ShareDocumentModal'

const MORE_ACTIONS = [
  'Delete Pages',
  'Rotate',
  'Convert to PDF',
  'Split',
  'Protect',
] as const

export function DocumentReadyScreen() {
  const exportedBlobUrl = usePdfEditorStore((s) => s.exportedBlobUrl)
  const exportedFilename = usePdfEditorStore((s) => s.exportedFilename)
  const pdfFileName = usePdfEditorStore((s) => s.pdfFileName)
  const setCurrentView = usePdfEditorStore((s) => s.setCurrentView)
  const showToast = usePdfEditorStore((s) => s.showToast)
  const clearExportResult = usePdfEditorStore((s) => s.clearExportResult)
  const reset = usePdfEditorStore((s) => s.reset)
  const loadBlankA4 = usePdfEditorStore((s) => s.loadBlankA4)

  const [shareOpen, setShareOpen] = useState(false)
  const [downloadOpen, setDownloadOpen] = useState(false)
  const [showMore, setShowMore] = useState(false)
  const [previewFailed, setPreviewFailed] = useState(false)
  const previewLoadedRef = useRef(false)

  const displayName = exportedFilename || pdfFileName || 'document.pdf'

  useEffect(() => {
    if (!exportedBlobUrl) return
    previewLoadedRef.current = false
    const raf = window.requestAnimationFrame(() => setPreviewFailed(false))
    const t = window.setTimeout(() => {
      if (!previewLoadedRef.current) {
        setPreviewFailed(true)
      }
    }, 2000)
    return () => {
      window.cancelAnimationFrame(raf)
      window.clearTimeout(t)
    }
  }, [exportedBlobUrl])

  const triggerDownload = (pdfa = false) => {
    if (pdfa) {
      showToast('PDF/A export is not available yet.')
      setDownloadOpen(false)
      return
    }
    const url = exportedBlobUrl
    if (!url) {
      showToast('No exported file available.')
      return
    }
    const a = document.createElement('a')
    a.href = url
    a.download = exportedFilename || 'document.pdf'
    a.click()
    setDownloadOpen(false)
  }

  const handlePrint = () => {
    const url = exportedBlobUrl
    if (!url) {
      showToast('No exported file to print.')
      return
    }
    const iframe = document.createElement('iframe')
    iframe.setAttribute('aria-hidden', 'true')
    Object.assign(iframe.style, {
      position: 'fixed',
      right: '0',
      bottom: '0',
      width: '0',
      height: '0',
      border: 'none',
    })
    iframe.src = url
    iframe.onload = () => {
      const w = iframe.contentWindow
      if (w) {
        w.focus()
        w.print()
      }
      window.setTimeout(() => iframe.remove(), 60_000)
    }
    document.body.appendChild(iframe)
  }

  const backToEditor = () => {
    setCurrentView('editor')
  }

  const startOver = async () => {
    clearExportResult()
    await reset()
    await loadBlankA4()
    setCurrentView('editor')
  }

  const deleteFiles = async () => {
    if (
      !window.confirm(
        'Delete this document and all edits? This cannot be undone.',
      )
    ) {
      return
    }
    await startOver()
  }

  const primaryActions = ['Edit', 'Compress', 'Extract Pages', 'Merge', 'Crop'] as const

  return (
    <div className="flex min-h-dvh flex-col bg-surface-alt text-near-black">
      <ShareDocumentModal open={shareOpen} onClose={() => setShareOpen(false)} />

      {/* ─── Header ─── */}
      <header className="sticky top-0 z-20 border-b border-ring bg-surface">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3">
          <button
            type="button"
            onClick={backToEditor}
            className="rounded-btn p-2 text-muted transition-colors hover:bg-surface-alt hover:text-near-black"
            aria-label="Back to editor"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex flex-1 items-center gap-2.5">
            <CheckCircle2
              className="h-6 w-6 shrink-0 text-accent"
              strokeWidth={2}
              aria-hidden
            />
            <h1 className="font-display text-base font-semibold text-near-black sm:text-lg">
              Your document is ready
            </h1>
          </div>
          <Link to="/" className="flex items-center gap-2 text-muted transition-colors hover:text-near-black">
            <span className="flex h-6 w-6 items-center justify-center rounded-[6px] bg-primary font-display text-[10px] font-bold text-white">
              P
            </span>
            <span className="hidden font-display text-sm font-semibold sm:block">PDF Studio</span>
          </Link>
        </div>
      </header>

      {/* ─── Content ─── */}
      <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-8 lg:flex-row">
        {/* Main area */}
        <main className="min-w-0 flex-1 space-y-5">
          {/* File info */}
          <div className="flex items-center gap-3 rounded-card border border-ring bg-surface p-4 shadow-card">
            <div className="flex h-10 w-10 items-center justify-center rounded-card bg-primary/8">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-near-black">{displayName}</p>
              <p className="text-xs text-muted">Ready to download</p>
            </div>
          </div>

          {/* Download */}
          <div className="relative flex rounded-card overflow-hidden shadow-card">
            <Button
              variant="primary"
              size="lg"
              className="flex-1 rounded-none rounded-l-card"
              onClick={() => triggerDownload(false)}
            >
              <Download className="h-5 w-5" />
              Download
            </Button>
            <div className="relative">
              <button
                type="button"
                onClick={() => setDownloadOpen((o) => !o)}
                className="flex h-full items-center border-l border-white/20 bg-primary px-3 text-white transition-colors hover:bg-primary-hover"
                aria-expanded={downloadOpen}
                aria-label="Download options"
              >
                <ChevronDown className="h-4 w-4" />
              </button>
              {downloadOpen ? (
                <div className="absolute right-0 top-full z-30 mt-1.5 min-w-[200px] rounded-card border border-ring bg-surface py-1 shadow-elevated">
                  <button
                    type="button"
                    onClick={() => triggerDownload(false)}
                    className="block w-full px-4 py-2.5 text-left text-sm font-medium text-near-black transition-colors hover:bg-surface-alt"
                  >
                    Download
                  </button>
                  <button
                    type="button"
                    onClick={() => triggerDownload(true)}
                    className="block w-full px-4 py-2.5 text-left text-sm font-medium text-near-black transition-colors hover:bg-surface-alt"
                  >
                    Download as PDF/A
                  </button>
                </div>
              ) : null}
            </div>
          </div>

          {/* Share & Print */}
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => setShareOpen(true)}>
              <Share2 className="h-4 w-4" />
              Share
            </Button>
            <Button variant="secondary" onClick={handlePrint}>
              <Printer className="h-4 w-4" />
              Print
            </Button>
          </div>

          {/* Preview */}
          <div className="overflow-hidden rounded-card border border-ring bg-surface shadow-card">
            <div className="border-b border-ring px-4 py-3">
              <p className="text-sm font-semibold text-near-black">PDF Preview</p>
            </div>
            <div>
              {exportedBlobUrl ? (
                <>
                  {previewFailed ? (
                    <p className="px-4 py-10 text-center text-sm text-muted">
                      Preview unavailable. You can still download the file.
                    </p>
                  ) : null}
                  <iframe
                    title="Exported PDF preview"
                    src={exportedBlobUrl}
                    className={`h-[min(65vh,600px)] w-full ${previewFailed ? 'hidden' : ''}`}
                    onLoad={() => {
                      previewLoadedRef.current = true
                      setPreviewFailed(false)
                    }}
                  />
                </>
              ) : (
                <p className="px-4 py-10 text-center text-sm text-muted">
                  No preview available.
                </p>
              )}
            </div>
          </div>
        </main>

        {/* Sidebar */}
        <aside className="w-full shrink-0 space-y-5 lg:w-64">
          <p className="font-display text-xs font-semibold uppercase tracking-wider text-placeholder">
            Continue editing
          </p>
          <div className="overflow-hidden rounded-card border border-ring bg-surface shadow-card">
            {primaryActions.map((label) => (
              <button
                key={label}
                type="button"
                onClick={() => {
                  if (label === 'Edit') {
                    backToEditor()
                  } else {
                    showToast('Coming soon.')
                  }
                }}
                className="flex w-full items-center justify-between border-b border-ring px-4 py-3 text-left text-sm font-medium text-near-black transition-colors last:border-0 hover:bg-surface-alt"
              >
                {label}
                <ChevronRight className="h-4 w-4 text-placeholder" />
              </button>
            ))}
            {showMore
              ? MORE_ACTIONS.map((label) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => showToast('Coming soon.')}
                    className="flex w-full items-center justify-between border-b border-ring px-4 py-3 text-left text-sm font-medium text-near-black transition-colors last:border-0 hover:bg-surface-alt"
                  >
                    {label}
                    <ChevronRight className="h-4 w-4 text-placeholder" />
                  </button>
                ))
              : null}
          </div>
          <button
            type="button"
            onClick={() => setShowMore((m) => !m)}
            className="text-sm font-medium text-primary transition-colors hover:text-primary-hover hover:underline"
          >
            {showMore ? 'Show less' : 'Show more'}
          </button>

          <div className="space-y-2 pt-3">
            <Button
              variant="secondary"
              className="w-full"
              onClick={backToEditor}
            >
              <ArrowLeft className="h-4 w-4" />
              Back to editing
            </Button>
            <Button
              variant="secondary"
              className="w-full"
              onClick={() => void startOver()}
            >
              <RotateCcw className="h-4 w-4" />
              Start over
            </Button>
            <Button
              variant="destructive"
              className="w-full"
              onClick={() => void deleteFiles()}
            >
              <Trash2 className="h-4 w-4" />
              Delete files
            </Button>
          </div>
        </aside>
      </div>
    </div>
  )
}
