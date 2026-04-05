import {
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Download,
  FileText,
  Pencil,
  Printer,
  RotateCcw,
  Share2,
  Trash2,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { usePdfEditorStore } from '../store/pdfEditorStore'
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
    <div className="flex min-h-dvh flex-col bg-[#f5f5f5] text-[#333]">
      <ShareDocumentModal open={shareOpen} onClose={() => setShareOpen(false)} />

      <header className="sticky top-0 z-20 border-b border-[#e5e5e5] bg-white px-4 py-3">
        <div className="mx-auto flex max-w-6xl items-center gap-3">
          <button
            type="button"
            onClick={backToEditor}
            className="rounded p-2 text-[#666] hover:bg-[#f0f0f0]"
            aria-label="Close"
          >
            ×
          </button>
          <div className="flex flex-1 items-center justify-center gap-2 sm:justify-start">
            <CheckCircle2
              className="h-8 w-8 shrink-0 text-[#00a67e]"
              strokeWidth={2}
              aria-hidden
            />
            <h1 className="text-lg font-bold text-[#222] sm:text-xl">
              Your document is ready
            </h1>
          </div>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-6 lg:flex-row">
        <main className="min-w-0 flex-1 space-y-4">
          <div className="flex flex-wrap items-center gap-2 rounded-lg border border-[#e8e8e8] bg-white px-4 py-3">
            <FileText className="h-5 w-5 text-[#40a9ff]" aria-hidden />
            <span className="max-w-[200px] flex-1 truncate text-sm font-medium">
              {displayName}
            </span>
            <button
              type="button"
              onClick={backToEditor}
              className="rounded p-1.5 text-[#40a9ff] hover:bg-[#f0f8ff]"
              title="Edit in editor"
              aria-label="Edit in editor"
            >
              <Pencil className="h-4 w-4" />
            </button>
          </div>

          <div className="relative flex rounded-lg border border-[#e8e8e8] bg-white">
            <button
              type="button"
              onClick={() => triggerDownload(false)}
              className="flex min-h-[48px] flex-1 items-center gap-2 rounded-l-lg bg-[#00a67e] px-4 py-3 text-left font-semibold text-white hover:bg-[#00916d]"
            >
              <Download className="h-5 w-5 shrink-0" />
              Download
            </button>
            <div className="relative">
              <button
                type="button"
                onClick={() => setDownloadOpen((o) => !o)}
                className="flex h-full min-h-[48px] items-center border-l border-white/30 px-3 text-white hover:bg-[#00916d]"
                aria-expanded={downloadOpen}
                aria-label="Download options"
              >
                <ChevronDown className="h-5 w-5" />
              </button>
              {downloadOpen ? (
                <div className="absolute right-0 top-full z-30 mt-1 min-w-[200px] rounded-md border border-[#e5e5e5] bg-white py-1 shadow-lg">
                  <button
                    type="button"
                    onClick={() => triggerDownload(false)}
                    className="block w-full px-4 py-2 text-left text-sm hover:bg-[#f5f5f5]"
                  >
                    Download
                  </button>
                  <button
                    type="button"
                    onClick={() => triggerDownload(true)}
                    className="block w-full px-4 py-2 text-left text-sm hover:bg-[#f5f5f5]"
                  >
                    Download as PDF/A
                  </button>
                </div>
              ) : null}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setShareOpen(true)}
              className="inline-flex items-center gap-2 rounded-lg border border-[#ddd] bg-white px-4 py-2.5 text-sm font-medium hover:bg-[#fafafa]"
            >
              <Share2 className="h-4 w-4" />
              Share
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-2 rounded-lg border border-[#ddd] bg-white px-4 py-2.5 text-sm font-medium hover:bg-[#fafafa]"
            >
              <Printer className="h-4 w-4" />
              Print
            </button>
          </div>

          <details className="rounded-lg border border-[#e8e8e8] bg-white">
            <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-[#333]">
              PDF preview
            </summary>
            <div className="border-t border-[#eee]">
              {exportedBlobUrl ? (
                <>
                  {previewFailed ? (
                    <p className="px-4 py-8 text-center text-sm text-[#888]">
                      Preview unavailable. You can still download the file.
                    </p>
                  ) : null}
                  <iframe
                    title="Exported PDF preview"
                    src={exportedBlobUrl}
                    className={`h-[min(70vh,640px)] w-full ${previewFailed ? 'hidden' : ''}`}
                    onLoad={() => {
                      previewLoadedRef.current = true
                      setPreviewFailed(false)
                    }}
                  />
                </>
              ) : (
                <p className="px-4 py-8 text-center text-sm text-[#888]">
                  No preview.
                </p>
              )}
            </div>
          </details>
        </main>

        <aside className="w-full shrink-0 space-y-4 lg:w-72">
          <p className="text-xs font-semibold tracking-wide text-[#888]">
            CONTINUE EDITING THIS DOCUMENT
          </p>
          <ul className="overflow-hidden rounded-lg border border-[#e8e8e8] bg-white">
            {primaryActions.map((label) => (
              <li key={label} className="border-b border-[#f0f0f0] last:border-0">
                <button
                  type="button"
                  onClick={() => {
                    if (label === 'Edit') {
                      backToEditor()
                    } else {
                      showToast('Coming soon.')
                    }
                  }}
                  className="flex w-full items-center justify-between px-4 py-3 text-left text-sm hover:bg-[#fafafa]"
                >
                  {label}
                  <ChevronRight className="h-4 w-4 text-[#bbb]" />
                </button>
              </li>
            ))}
            {showMore
              ? MORE_ACTIONS.map((label) => (
                  <li key={label} className="border-b border-[#f0f0f0] last:border-0">
                    <button
                      type="button"
                      onClick={() => showToast('Coming soon.')}
                      className="flex w-full items-center justify-between px-4 py-3 text-left text-sm hover:bg-[#fafafa]"
                    >
                      {label}
                      <ChevronRight className="h-4 w-4 text-[#bbb]" />
                    </button>
                  </li>
                ))
              : null}
          </ul>
          <button
            type="button"
            onClick={() => setShowMore((m) => !m)}
            className="text-sm font-medium text-[#00a67e] hover:underline"
          >
            {showMore ? 'Show less' : 'Show more'}
          </button>

          <div className="space-y-2 pt-4">
            <button
              type="button"
              onClick={backToEditor}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-[#ddd] bg-white py-2.5 text-sm font-medium hover:bg-[#fafafa]"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to editing
            </button>
            <button
              type="button"
              onClick={() => void startOver()}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-[#ddd] bg-white py-2.5 text-sm font-medium hover:bg-[#fafafa]"
            >
              <RotateCcw className="h-4 w-4" />
              Start over
            </button>
            <button
              type="button"
              onClick={() => void deleteFiles()}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-[#fecaca] bg-[#fff5f5] py-2.5 text-sm font-medium text-[#b91c1c] hover:bg-[#fee2e2]"
            >
              <Trash2 className="h-4 w-4" />
              Delete files
            </button>
          </div>
        </aside>
      </div>
    </div>
  )
}
