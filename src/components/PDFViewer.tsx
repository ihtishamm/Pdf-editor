import { Canvas, IText, version as fabricVersion } from 'fabric'
import { useEffect, useRef, useState } from 'react'
import type { RenderTask } from 'pdfjs-dist'
import { addPdfTextItemsToCanvas } from '../lib/pdfTextToFabric'
import { usePdfEditorStore } from '../store/pdfEditorStore'
import { TextEditToolbar } from './TextEditToolbar'

if (import.meta.env.DEV) {
  console.info('[fabric] version', fabricVersion)
}

/**
 * Renders the current PDF page on a base canvas and a Fabric edit layer on top.
 * After each render, PDF.js text is extracted and overlaid with matching invisible IText runs.
 */
export function PDFViewer() {
  const pdf = usePdfEditorStore((s) => s.pdf)
  const currentPage = usePdfEditorStore((s) => s.currentPage)
  const zoomLevel = usePdfEditorStore((s) => s.zoomLevel)
  const activeTool = usePdfEditorStore((s) => s.activeTool)
  const registerFabric = usePdfEditorStore((s) => s.registerFabric)
  const unregisterFabricPage = usePdfEditorStore((s) => s.unregisterFabricPage)

  const activeToolRef = useRef(activeTool)
  useEffect(() => {
    activeToolRef.current = activeTool
  }, [activeTool])

  const measureRef = useRef<HTMLDivElement>(null)
  const fabricHostRef = useRef<HTMLDivElement>(null)
  const fabricInstanceRef = useRef<Canvas | null>(null)
  const [containerWidth, setContainerWidth] = useState(0)

  const pdfCanvasRef = useRef<HTMLCanvasElement>(null)

  const [overlayCanvas, setOverlayCanvas] = useState<Canvas | null>(null)
  const [selectedIText, setSelectedIText] = useState<IText | null>(null)

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

      const textContent = await page.getTextContent()
      if (signal.aborted) return

      fabricHostEl.replaceChildren()
      const fabricEl = document.createElement('canvas')
      fabricHostEl.appendChild(fabricEl)

      const fabricCanvas = new Canvas(fabricEl, {
        width: w,
        height: h,
        selection: true,
        enablePointerEvents: true,
        backgroundColor: 'transparent',
        enableRetinaScaling: false,
      })

      fabricCanvas.defaultCursor =
        activeToolRef.current === 'text' ? 'crosshair' : 'default'

      if (signal.aborted) {
        await fabricCanvas.dispose()
        return
      }

      addPdfTextItemsToCanvas(fabricCanvas, textContent, viewport)

      if (signal.aborted) {
        await fabricCanvas.dispose()
        return
      }

      const syncSelection = () => {
        const obj = fabricCanvas.getActiveObject()
        setSelectedIText(obj instanceof IText ? obj : null)
      }

      const onSelectionCreated = () => syncSelection()
      const onSelectionUpdated = () => syncSelection()
      const onSelectionCleared = () => setSelectedIText(null)

      fabricCanvas.on('selection:created', onSelectionCreated)
      fabricCanvas.on('selection:updated', onSelectionUpdated)
      fabricCanvas.on('selection:cleared', onSelectionCleared)

      const onMouseDown = (opt: { target?: unknown; scenePoint: { x: number; y: number } }) => {
        if (activeToolRef.current !== 'text') return
        if (opt.target) return
        const { x, y } = opt.scenePoint
        const t = new IText('Type here', {
          left: x,
          top: y,
          fontSize: 16,
          fill: '#111827',
          fontFamily: 'sans-serif',
          editable: true,
          objectCaching: false,
        })
        fabricCanvas.add(t)
        fabricCanvas.setActiveObject(t)
        fabricCanvas.requestRenderAll()
        setSelectedIText(t)
      }

      fabricCanvas.on('mouse:down', onMouseDown)

      fabricInstanceRef.current = fabricCanvas
      setOverlayCanvas(fabricCanvas)
      await registerFabric(currentPage, fabricCanvas)
    })()

    return () => {
      ac.abort()
      renderTask?.cancel()
      setSelectedIText(null)
      setOverlayCanvas(null)

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

  useEffect(() => {
    const c = fabricInstanceRef.current
    if (!c) return
    c.defaultCursor = activeTool === 'text' ? 'crosshair' : 'default'
  }, [activeTool])

  return (
    <div ref={measureRef} className="flex w-full min-w-0 justify-center px-4 pb-32 pt-6">
      <TextEditToolbar canvas={overlayCanvas} target={selectedIText} />
      <div className="relative inline-block max-w-full shadow-[0_4px_24px_rgba(0,0,0,0.12)]">
        <canvas
          ref={pdfCanvasRef}
          className="relative z-10 block max-w-full bg-white"
          aria-hidden
        />
        <div
          ref={fabricHostRef}
          className="pdf-editor-fabric-host absolute inset-0 z-20"
          aria-hidden
        />
      </div>
    </div>
  )
}
