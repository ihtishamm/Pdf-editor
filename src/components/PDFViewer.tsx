import { Canvas, IText, version as fabricVersion } from 'fabric'
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type DragEvent,
} from 'react'
import type { TPointerEventInfo } from 'fabric'
import type { RenderTask } from 'pdfjs-dist'
import { applyCanvasToolMode, attachFabricCanvasTools } from '../lib/fabricCanvasTools'
import {
  addFabricImageFromDataUrl,
  addFabricImageFromFile,
  pickImageFilesFromDataTransfer,
} from '../lib/insertFabricImage'
import {
  addFormFieldsToCanvas,
  createFabricFormField,
  getFormFieldId,
  isFormFieldObject,
  refreshFabricFormField,
} from '../lib/fabricFormField'
import { attachFabricHistoryToCanvas } from '../lib/attachFabricHistoryToCanvas'
import { fabricHistoryRuntime } from '../lib/fabricHistoryRuntime'
import { markFabricHistoryUser } from '../lib/fabricHistoryHelpers'
import {
  addPdfLinksToCanvas,
  applyPdfLinksLockState,
  createFabricPdfLink,
} from '../lib/fabricPdfLink'
import {
  applyPageOverlayToCanvas,
  capturePageOverlay,
} from '../lib/pageOverlaySnapshot'
import { addPdfTextItemsToCanvas } from '../lib/pdfTextToFabric'
import type { FormFieldType } from '../types/formFields'

const FORM_FIELD_HISTORY_LABELS: Record<FormFieldType, string> = {
  text: 'Text field',
  checkbox: 'Checkbox',
  radio: 'Radio',
  dropdown: 'Dropdown',
  button: 'Button',
}
import { usePdfEditorStore } from '../store/pdfEditorStore'
import { CommentPanel } from './CommentPanel'
import { LinkPropertiesPopover } from './LinkPropertiesPopover'
import { FormFieldFloatingToolbar } from './FormFieldFloatingToolbar'
import { FormFieldPropertiesPanel } from './FormFieldPropertiesPanel'
import { ImagePropertiesPanel } from './ImagePropertiesPanel'
import { ShapePropertiesToolbar } from './ShapePropertiesToolbar'
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
  const annotateVariant = usePdfEditorStore((s) => s.annotateVariant)
  const registerFabric = usePdfEditorStore((s) => s.registerFabric)
  const unregisterFabricPage = usePdfEditorStore((s) => s.unregisterFabricPage)
  const pendingImageInsert = usePdfEditorStore((s) => s.pendingImageInsert)
  const clearPendingImageInsert = usePdfEditorStore((s) => s.clearPendingImageInsert)
  const pendingSignature = usePdfEditorStore((s) => s.pendingSignature)
  const clearPendingSignatureDataUrl = usePdfEditorStore(
    (s) => s.clearPendingSignatureDataUrl,
  )
  const enqueueImageInsert = usePdfEditorStore((s) => s.enqueueImageInsert)
  const setActiveTool = usePdfEditorStore((s) => s.setActiveTool)
  const pdfLinks = usePdfEditorStore((s) => s.pdfLinks)
  const formFields = usePdfEditorStore((s) => s.formFields)
  const selectedFormFieldId = usePdfEditorStore((s) => s.selectedFormFieldId)
  const selectedFormField = usePdfEditorStore((s) =>
    s.formFields.find((f) => f.id === s.selectedFormFieldId),
  )

  const measureRef = useRef<HTMLDivElement>(null)
  const fabricHostRef = useRef<HTMLDivElement>(null)
  const fabricInstanceRef = useRef<Canvas | null>(null)
  /** Last pointer position in Fabric scene space (for placing saved signatures at cursor). */
  const lastScenePointerRef = useRef({ x: 0, y: 0 })
  const [containerWidth, setContainerWidth] = useState(0)

  const pdfCanvasRef = useRef<HTMLCanvasElement>(null)

  const [overlayCanvas, setOverlayCanvas] = useState<Canvas | null>(null)
  const [selectedIText, setSelectedIText] = useState<IText | null>(null)
  const [linkPanel, setLinkPanel] = useState<{
    linkId: string
    anchor: { x: number; y: number }
  } | null>(null)

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
    let detachFabricTools: (() => void) | null = null
    let detachFabricHistory: (() => void) | null = null

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
        /** Required so hit-testing respects z-order; otherwise the active object (e.g. PDF IText) steals clicks from shapes above it. */
        preserveObjectStacking: true,
        /** Fabric v7 defaults: non-uniform scale by default; hold Shift for aspect lock (`uniScaleKey`). */
        uniformScaling: true,
        uniScaleKey: 'shiftKey',
      })

      if (signal.aborted) {
        await fabricCanvas.dispose()
        return
      }

      fabricHistoryRuntime.runSuppressed(() => {
        addPdfTextItemsToCanvas(fabricCanvas, textContent, viewport)
        addFormFieldsToCanvas(
          fabricCanvas,
          usePdfEditorStore.getState().formFields,
          currentPage,
          w,
          h,
        )
        addPdfLinksToCanvas(
          fabricCanvas,
          usePdfEditorStore.getState().pdfLinks,
          currentPage,
          w,
          h,
          usePdfEditorStore.getState().activeTool === 'links',
        )
      })

      if (signal.aborted) {
        await fabricCanvas.dispose()
        return
      }

      await applyPageOverlayToCanvas(
        fabricCanvas,
        usePdfEditorStore.getState().pageOverlaySnapshots.get(currentPage),
      )

      if (signal.aborted) {
        await fabricCanvas.dispose()
        return
      }

      const store = usePdfEditorStore.getState

      const historyApi = attachFabricHistoryToCanvas(
        fabricCanvas,
        () => store().currentPage,
        (partial) => store().addHistory(partial),
      )
      detachFabricHistory = historyApi.dispose

      detachFabricTools = attachFabricCanvasTools(
        fabricCanvas,
        {
          getActiveTool: () => store().activeTool,
          getShapeVariant: () => store().shapeVariant,
          getAnnotateVariant: () => store().annotateVariant,
          getFormFieldVariant: () => store().formFieldVariant,
          getCurrentPage: () => store().currentPage,
        },
        {
          addCommentAt: (p, sx, sy) => store().addCommentAt(p, sx, sy),
          onSelectionIText: (t) => {
            setSelectedIText(t)
          },
          onSelectionFormField: (id) => store().setSelectedFormFieldId(id),
          onFormFieldBox: (args) => {
            const s = store()
            const position = {
              x: args.left / args.canvasW,
              y: args.top / args.canvasH,
            }
            const size = {
              w: args.width / args.canvasW,
              h: args.height / args.canvasH,
            }
            const t = args.variant as FormFieldType
            const meta = s.addFormField({
              page: args.page,
              type: t,
              name: '',
              position,
              size,
              options: t === 'dropdown' ? ['Option 1', 'Option 2'] : [],
              required: false,
              placeholder: '',
              radioGroupName: '',
              radioOptionId: '',
              buttonLabel: t === 'button' ? 'Button' : '',
              borderColor: '#dc2626',
              textColor: '#9ca3af',
              fontSize: 14,
            })
            const g = createFabricFormField(
              meta,
              fabricCanvas.getWidth(),
              fabricCanvas.getHeight(),
            )
            markFabricHistoryUser(g, 'form', FORM_FIELD_HISTORY_LABELS[t])
            g.set({
              selectable: true,
              evented: true,
              hasControls: true,
              hasBorders: true,
            })
            g.setCoords()
            fabricCanvas.add(g)
            fabricCanvas.bringObjectToFront(g)
            fabricCanvas.setActiveObject(g)
            fabricCanvas.requestRenderAll()
            s.setSelectedFormFieldId(meta.id)
            s.setActiveTool('select')
          },
          onFormFieldGeometryCommit: (fieldId, position, size) => {
            store().updateFormField(fieldId, { position, size })
          },
          onLinkBoxDrawn: (args) => {
            const s = store()
            const position = {
              x: args.left / args.canvasW,
              y: args.top / args.canvasH,
            }
            const size = {
              w: args.width / args.canvasW,
              h: args.height / args.canvasH,
            }
            const entry = s.addPdfLink({
              page: args.page,
              position,
              size,
            })
            const cw0 = fabricCanvas.getWidth()
            const ch0 = fabricCanvas.getHeight()
            const linkRect = createFabricPdfLink(
              entry,
              cw0,
              ch0,
              s.activeTool === 'links',
            )
            fabricCanvas.add(linkRect)
            fabricCanvas.bringObjectToFront(linkRect)
            fabricCanvas.requestRenderAll()
            const el = fabricCanvas.upperCanvasEl
            const br = el.getBoundingClientRect()
            const sx = br.width / args.canvasW
            const sy = br.height / args.canvasH
            setLinkPanel({
              linkId: entry.id,
              anchor: {
                x: br.left + (args.left + args.width / 2) * sx,
                y: br.top + (args.top + args.height / 2) * sy,
              },
            })
          },
          onLinkClicked: (linkId) => {
            const s = store()
            const link = s.pdfLinks.find((l) => l.id === linkId)
            if (!link || link.page !== currentPage) return
            const cw = fabricCanvas.getWidth()
            const ch = fabricCanvas.getHeight()
            const el = fabricCanvas.upperCanvasEl
            const b = el.getBoundingClientRect()
            const cx = (link.position.x + link.size.w / 2) * cw
            const cy = (link.position.y + link.size.h / 2) * ch
            setLinkPanel({
              linkId,
              anchor: {
                x: b.left + (cx / cw) * b.width,
                y: b.top + (cy / ch) * b.height,
              },
            })
          },
          onPdfLinkGeometryCommit: (linkId, position, size) => {
            store().updatePdfLink(linkId, { position, size })
          },
          onManualHistoryAdd: (o) => historyApi.manualRecordAdd(o),
        },
      )

      applyCanvasToolMode(
        fabricCanvas,
        store().activeTool,
        store().annotateVariant,
      )

      if (signal.aborted) {
        if (detachFabricHistory) {
          detachFabricHistory()
          detachFabricHistory = null
        }
        detachFabricTools()
        detachFabricTools = null
        await fabricCanvas.dispose()
        return
      }

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

      if (detachFabricHistory) {
        detachFabricHistory()
        detachFabricHistory = null
      }
      if (detachFabricTools) {
        detachFabricTools()
        detachFabricTools = null
      }

      if (inst) {
        const snap = capturePageOverlay(inst)
        usePdfEditorStore.getState().savePageOverlaySnapshot(
          currentPage,
          snap.objects.length > 0 ? snap : null,
        )
      }

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
    if (!overlayCanvas) return
    applyCanvasToolMode(overlayCanvas, activeTool, annotateVariant)
    fabricHistoryRuntime.runSuppressed(() => {
      applyPdfLinksLockState(overlayCanvas, activeTool === 'links')
    })
  }, [overlayCanvas, activeTool, annotateVariant])

  useEffect(() => {
    if (!overlayCanvas) return
    const cw = overlayCanvas.getWidth()
    const ch = overlayCanvas.getHeight()
    addPdfLinksToCanvas(
      overlayCanvas,
      pdfLinks,
      currentPage,
      cw,
      ch,
      activeTool === 'links',
    )
  }, [pdfLinks, overlayCanvas, currentPage, activeTool])

  useEffect(() => {
    if (!linkPanel) return
    const still = pdfLinks.some(
      (l) => l.id === linkPanel.linkId && l.page === currentPage,
    )
    if (!still) {
      queueMicrotask(() => setLinkPanel(null))
    }
  }, [pdfLinks, currentPage, linkPanel])

  useEffect(() => {
    if (!pdf) queueMicrotask(() => setLinkPanel(null))
  }, [pdf])

  const fieldRefreshKey = selectedFormField
    ? [
        selectedFormField.name,
        selectedFormField.required,
        selectedFormField.placeholder,
        selectedFormField.options.join('\u0001'),
        selectedFormField.radioGroupName,
        selectedFormField.radioOptionId,
        selectedFormField.buttonLabel,
        selectedFormField.borderColor,
        selectedFormField.textColor,
        selectedFormField.fontSize,
      ].join('|')
    : ''

  useEffect(() => {
    if (!fieldRefreshKey || !overlayCanvas || !selectedFormFieldId) return
    const f = usePdfEditorStore
      .getState()
      .formFields.find((x) => x.id === selectedFormFieldId)
    if (!f || f.page !== currentPage) return
    fabricHistoryRuntime.runSuppressed(() => {
      refreshFabricFormField(
        overlayCanvas,
        f,
        overlayCanvas.getWidth(),
        overlayCanvas.getHeight(),
      )
    })
  }, [
    fieldRefreshKey,
    selectedFormFieldId,
    overlayCanvas,
    currentPage,
  ])

  useEffect(() => {
    if (!overlayCanvas) return
    const valid = new Set(
      formFields.filter((f) => f.page === currentPage).map((f) => f.id),
    )
    let removed = false
    for (const o of [...overlayCanvas.getObjects()]) {
      if (!isFormFieldObject(o)) continue
      const id = getFormFieldId(o)
      if (id && !valid.has(id)) {
        overlayCanvas.remove(o)
        removed = true
      }
    }
    if (removed) overlayCanvas.requestRenderAll()
  }, [formFields, overlayCanvas, currentPage])

  useEffect(() => {
    if (!pendingImageInsert || !overlayCanvas) return
    const file = pendingImageInsert
    clearPendingImageInsert()
    void (async () => {
      try {
        await addFabricImageFromFile(overlayCanvas, file)
        setActiveTool('select')
      } catch (err) {
        console.error('[PDFViewer] image insert failed', err)
      }
    })()
  }, [
    pendingImageInsert,
    overlayCanvas,
    clearPendingImageInsert,
    setActiveTool,
  ])

  useEffect(() => {
    if (!overlayCanvas) return
    const cw = overlayCanvas.getWidth()
    const ch = overlayCanvas.getHeight()
    lastScenePointerRef.current = { x: cw / 2, y: ch / 2 }

    const onMove = (opt: TPointerEventInfo) => {
      const p = opt.scenePoint
      if (p) {
        lastScenePointerRef.current = { x: p.x, y: p.y }
      }
    }
    overlayCanvas.on('mouse:move', onMove)
    return () => {
      overlayCanvas.off('mouse:move', onMove)
    }
  }, [overlayCanvas])

  useEffect(() => {
    if (!pendingSignature || !overlayCanvas) return
    const { dataUrl, placeAtCursor } = pendingSignature
    clearPendingSignatureDataUrl()
    const pt = lastScenePointerRef.current
    const placement =
      placeAtCursor && Number.isFinite(pt.x) && Number.isFinite(pt.y)
        ? ({ mode: 'scene' as const, x: pt.x, y: pt.y })
        : ({ mode: 'center' as const })
    void (async () => {
      try {
        await addFabricImageFromDataUrl(
          overlayCanvas,
          dataUrl,
          'Signature',
          placement,
        )
      } catch (err) {
        console.error('[PDFViewer] signature insert failed', err)
      }
    })()
  }, [pendingSignature, overlayCanvas, clearPendingSignatureDataUrl])

  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    if (!pickImageFilesFromDataTransfer(e.dataTransfer).length) return
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
  }, [])

  const handleDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      const files = pickImageFilesFromDataTransfer(e.dataTransfer)
      if (!files.length) return
      e.preventDefault()
      e.stopPropagation()
      const c = fabricInstanceRef.current
      if (!c) {
        enqueueImageInsert(files[0]!)
        setActiveTool('select')
        return
      }
      void (async () => {
        for (const f of files) {
          try {
            await addFabricImageFromFile(c, f)
          } catch (err) {
            console.error('[PDFViewer] drop image failed', err)
          }
        }
        setActiveTool('select')
      })()
    },
    [enqueueImageInsert, setActiveTool],
  )

  return (
    <div className="flex min-w-0 flex-1">
      <div
        ref={measureRef}
        className="flex min-w-0 flex-1 justify-center px-4 pb-32 pt-6"
      >
        <TextEditToolbar canvas={overlayCanvas} target={selectedIText} />
        <LinkPropertiesPopover
          linkId={linkPanel?.linkId ?? null}
          anchor={linkPanel?.anchor ?? null}
          onClose={() => setLinkPanel(null)}
        />
        <FormFieldFloatingToolbar canvas={overlayCanvas} activeTool={activeTool} />
        <ShapePropertiesToolbar canvas={overlayCanvas} activeTool={activeTool} />
        <ImagePropertiesPanel canvas={overlayCanvas} activeTool={activeTool} />
        <CommentPanel />
        <div
          className="relative inline-block max-w-full shadow-[0_4px_24px_rgba(0,0,0,0.12)]"
          onDragEnter={handleDragOver}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
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
      <FormFieldPropertiesPanel />
    </div>
  )
}
