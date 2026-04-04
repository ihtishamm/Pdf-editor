import { Canvas } from 'fabric'
import { useEffect, useRef, useState } from 'react'
import type { RenderTask } from 'pdfjs-dist'
import { usePdfEditorStore } from '../store/pdfEditorStore'

/**
 * Renders the current PDF page on a base canvas and a pixel-aligned Fabric canvas on top.
 * Uses a programmatic Fabric canvas (fresh DOM node per run) so React Strict Mode cannot
 * hit "canvas already initialized". PDF is rendered before Fabric so the page is visible even
 * if the overlay fails.
 */
export function PDFViewer() {
  const pdf = usePdfEditorStore((s) => s.pdf)
  const currentPage = usePdfEditorStore((s) => s.currentPage)
  const zoomLevel = usePdfEditorStore((s) => s.zoomLevel)
  const registerFabric = usePdfEditorStore((s) => s.registerFabric)
  const unregisterFabricPage = usePdfEditorStore((s) => s.unregisterFabricPage)

  const measureRef = useRef<HTMLDivElement>(null)
  const fabricHostRef = useRef<HTMLDivElement>(null)
  const fabricInstanceRef = useRef<Canvas | null>(null)
  const [containerWidth, setContainerWidth] = useState(0)

  const pdfCanvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const el = measureRef.current
    if (!el) return
    const ro = new ResizeObserver(() => {
      setContainerWidth(el.getBoundingClientRect().width)
    })
    ro.observe(el)
    setContainerWidth(el.getBoundingClientRect().width)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    if (!pdf || containerWidth <= 0) return

    const pdfCanvas = pdfCanvasRef.current
    const fabricHostEl = fabricHostRef.current
    if (!pdfCanvas || !fabricHostEl) return

    const ac = new AbortController()
    const { signal } = ac
    let renderTask: RenderTask | null = null

    void (async () => {
      const page = await pdf.getPage(currentPage)
      if (signal.aborted) return

      const base = page.getViewport({ scale: 1 })
      const fitScale = containerWidth / base.width
      const scale = fitScale * zoomLevel
      const viewport = page.getViewport({ scale })

      const w = Math.floor(viewport.width)
      const h = Math.floor(viewport.height)

      pdfCanvas.width = w
      pdfCanvas.height = h

      renderTask = page.render({
        canvas: pdfCanvas,
        viewport,
      })

      try {
        await renderTask.promise
      } catch {
        /* RenderingCancelledException */
      }
      if (signal.aborted) return

      fabricHostEl.replaceChildren()
      const fabricEl = document.createElement('canvas')
      fabricHostEl.appendChild(fabricEl)

      const fabricCanvas = new Canvas(fabricEl, {
        width: w,
        height: h,
        selection: false,
        enablePointerEvents: false,
        backgroundColor: 'transparent',
        enableRetinaScaling: false,
      })

      if (signal.aborted) {
        await fabricCanvas.dispose()
        return
      }

      fabricInstanceRef.current = fabricCanvas
      await registerFabric(currentPage, fabricCanvas)
    })()

    return () => {
      ac.abort()
      renderTask?.cancel()

      const inst = fabricInstanceRef.current
      fabricInstanceRef.current = null
      fabricHostEl.replaceChildren()

      unregisterFabricPage(currentPage)

      void (async () => {
        if (inst) {
          await inst.dispose()
        }
      })()
    }
  }, [
    pdf,
    currentPage,
    zoomLevel,
    containerWidth,
    registerFabric,
    unregisterFabricPage,
  ])

  return (
    <div ref={measureRef} className="flex w-full min-w-0 justify-center px-4 pb-32 pt-6">
      <div className="relative inline-block max-w-full shadow-[0_4px_24px_rgba(0,0,0,0.12)]">
        <canvas
          ref={pdfCanvasRef}
          className="relative z-10 block max-w-full bg-white"
          aria-hidden
        />
        <div
          ref={fabricHostRef}
          className="pdf-editor-fabric-host pointer-events-none absolute inset-0 z-20"
          aria-hidden
        />
      </div>
    </div>
  )
}
