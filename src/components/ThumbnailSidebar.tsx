import { useEffect, useRef } from 'react'
import type { PDFDocumentProxy, RenderTask } from 'pdfjs-dist'

type ThumbnailPageProps = {
  pdf: PDFDocumentProxy
  pageNumber: number
  isActive: boolean
  onSelect: (page: number) => void
}

function ThumbnailPage({
  pdf,
  pageNumber,
  isActive,
  onSelect,
}: ThumbnailPageProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    let cancelled = false
    let renderTask: RenderTask | null = null

    void (async () => {
      const page = await pdf.getPage(pageNumber)
      if (cancelled) return

      const thumbWidth = 112
      const base = page.getViewport({ scale: 1 })
      const scale = thumbWidth / base.width
      const viewport = page.getViewport({ scale })

      const w = Math.floor(viewport.width)
      const h = Math.floor(viewport.height)
      canvas.width = w
      canvas.height = h

      renderTask = page.render({
        canvas,
        viewport,
      })
      try {
        await renderTask.promise
      } catch {
        /* cancelled */
      }
    })()

    return () => {
      cancelled = true
      renderTask?.cancel()
    }
  }, [pdf, pageNumber])

  return (
    <button
      type="button"
      onClick={() => onSelect(pageNumber)}
      className={`flex w-full flex-col gap-1 rounded border bg-white p-1 text-left transition hover:bg-slate-50 ${
        isActive
          ? 'border-[#40a9ff] ring-2 ring-[#b3d7ff]'
          : 'border-[#d9d9d9]'
      }`}
    >
      <canvas
        ref={canvasRef}
        className="mx-auto block max-h-[140px] w-full bg-white object-contain"
      />
      <span className="text-center text-xs text-slate-600">{pageNumber}</span>
    </button>
  )
}

type ThumbnailSidebarProps = {
  pdf: PDFDocumentProxy
  totalPages: number
  currentPage: number
  onSelectPage: (page: number) => void
}

export function ThumbnailSidebar({
  pdf,
  totalPages,
  currentPage,
  onSelectPage,
}: ThumbnailSidebarProps) {
  return (
    <aside className="flex w-[140px] shrink-0 flex-col gap-2 overflow-y-auto border-l border-[#e8e8e8] bg-[#fafafa] px-2 py-3">
      <p className="px-1 text-[11px] font-medium uppercase tracking-wide text-slate-500">
        Pages
      </p>
      {Array.from({ length: totalPages }, (_, i) => i + 1).map((num) => (
        <ThumbnailPage
          key={num}
          pdf={pdf}
          pageNumber={num}
          isActive={num === currentPage}
          onSelect={onSelectPage}
        />
      ))}
    </aside>
  )
}
