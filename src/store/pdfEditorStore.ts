import { Canvas } from 'fabric'
import { getDocument, type PDFDocumentProxy } from 'pdfjs-dist'
import { create } from 'zustand'

const MIN_ZOOM = 0.5
const MAX_ZOOM = 3
const ZOOM_STEP = 0.1

export type PdfEditorState = {
  pdf: PDFDocumentProxy | null
  pdfFileName: string
  currentPage: number
  totalPages: number
  /** Multiplier applied after fit-to-width (1 = 100% of fit). */
  zoomLevel: number
  fabricByPage: Map<number, Canvas>
}

export type PdfEditorActions = {
  loadPdfFromBytes: (data: Uint8Array, fileName: string) => Promise<void>
  loadBlankA4: () => Promise<void>
  loadFile: (file: File) => Promise<void>
  setPage: (page: number) => void
  setZoomLevel: (level: number) => void
  zoomIn: () => void
  zoomOut: () => void
  registerFabric: (page: number, canvas: Canvas) => Promise<void>
  disposeFabric: (page: number) => Promise<void>
  /** Remove map entry without disposing — use when the instance was already disposed. */
  unregisterFabricPage: (page: number) => void
  disposeAllFabric: () => Promise<void>
  reset: () => Promise<void>
}

function clampZoom(z: number): number {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z))
}

async function disposeAllFabricFromMap(
  map: Map<number, Canvas>,
): Promise<void> {
  for (const c of map.values()) {
    await c.dispose()
  }
}

export const usePdfEditorStore = create<PdfEditorState & PdfEditorActions>(
  (set, get) => ({
    pdf: null,
    pdfFileName: '',
    currentPage: 1,
    totalPages: 0,
    zoomLevel: 1,
    fabricByPage: new Map(),

    loadPdfFromBytes: async (data, fileName) => {
      const prev = get().pdf
      const fabrics = get().fabricByPage
      await disposeAllFabricFromMap(fabrics)
      if (prev) {
        await prev.destroy()
      }

      const copy = new Uint8Array(data)
      const loadingTask = getDocument({ data: copy })
      const pdf = await loadingTask.promise
      set({
        pdf,
        pdfFileName: fileName,
        totalPages: pdf.numPages,
        currentPage: 1,
        fabricByPage: new Map(),
        zoomLevel: 1,
      })
    },

    loadBlankA4: async () => {
      const { PDFDocument, PageSizes } = await import('pdf-lib')
      const doc = await PDFDocument.create()
      doc.addPage(PageSizes.A4)
      const bytes = await doc.save()
      await get().loadPdfFromBytes(bytes, 'Blank document.pdf')
    },

    loadFile: async (file) => {
      const buf = new Uint8Array(await file.arrayBuffer())
      await get().loadPdfFromBytes(buf, file.name)
    },

    setPage: (page) => {
      const { totalPages } = get()
      if (totalPages < 1) return
      const next = Math.min(totalPages, Math.max(1, Math.floor(page)))
      set({ currentPage: next })
    },

    setZoomLevel: (level) => set({ zoomLevel: clampZoom(level) }),

    zoomIn: () =>
      set((s) => ({ zoomLevel: clampZoom(s.zoomLevel + ZOOM_STEP) })),

    zoomOut: () =>
      set((s) => ({ zoomLevel: clampZoom(s.zoomLevel - ZOOM_STEP) })),

    registerFabric: async (page, canvas) => {
      const prev = get().fabricByPage.get(page)
      if (prev && prev !== canvas) {
        await prev.dispose()
      }
      set((state) => {
        const next = new Map(state.fabricByPage)
        next.set(page, canvas)
        return { fabricByPage: next }
      })
    },

    disposeFabric: async (page) => {
      const c = get().fabricByPage.get(page)
      if (c) {
        await c.dispose()
      }
      set((state) => {
        const next = new Map(state.fabricByPage)
        next.delete(page)
        return { fabricByPage: next }
      })
    },

    unregisterFabricPage: (page) => {
      set((state) => {
        const next = new Map(state.fabricByPage)
        next.delete(page)
        return { fabricByPage: next }
      })
    },

    disposeAllFabric: async () => {
      const map = get().fabricByPage
      await disposeAllFabricFromMap(map)
      set({ fabricByPage: new Map() })
    },

    reset: async () => {
      const { pdf, fabricByPage } = get()
      await disposeAllFabricFromMap(fabricByPage)
      if (pdf) {
        await pdf.destroy()
      }
      set({
        pdf: null,
        pdfFileName: '',
        currentPage: 1,
        totalPages: 0,
        zoomLevel: 1,
        fabricByPage: new Map(),
      })
    },
  }),
)
