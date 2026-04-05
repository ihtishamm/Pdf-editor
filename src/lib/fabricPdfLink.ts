import { Rect, type Canvas, type FabricObject } from 'fabric'
import type { PdfLinkEntry } from '../types/pdfLinks'

export const PDF_LINK_TOOL = 'pdfLink' as const

export function isPdfLinkObject(o: FabricObject | undefined): boolean {
  if (!o) return false
  const d = (o as FabricObject & { data?: { tool?: string } }).data
  return d?.tool === PDF_LINK_TOOL
}

export function getPdfLinkId(o: FabricObject | undefined): string | null {
  if (!o || !isPdfLinkObject(o)) return null
  const id = (o as FabricObject & { data?: { linkId?: string } }).data?.linkId
  return id ?? null
}

/** Visual style: dashed blue stroke, light blue fill ~20% opacity, no solid-only border. */
export const PDF_LINK_RECT_STYLE = {
  fill: 'rgba(64, 169, 255, 0.2)',
  stroke: '#2563eb',
  strokeWidth: 1.5,
  strokeDashArray: [6, 4] as number[],
  objectCaching: false,
}

export function createFabricPdfLink(
  entry: PdfLinkEntry,
  canvasW: number,
  canvasH: number,
  linksToolActive: boolean,
): Rect {
  const left = entry.position.x * canvasW
  const top = entry.position.y * canvasH
  const width = entry.size.w * canvasW
  const height = entry.size.h * canvasH
  const r = new Rect({
    left,
    top,
    width: Math.max(2, width),
    height: Math.max(2, height),
    ...PDF_LINK_RECT_STYLE,
    selectable: linksToolActive,
    evented: linksToolActive,
    hasControls: linksToolActive,
    hasBorders: linksToolActive,
    lockScalingFlip: true,
  })
  Object.assign(r, {
    data: { tool: PDF_LINK_TOOL, linkId: entry.id },
  })
  r.setCoords()
  return r
}

export function applyPdfLinksLockState(
  canvas: Canvas,
  linksToolActive: boolean,
): void {
  for (const o of canvas.getObjects()) {
    if (!isPdfLinkObject(o)) continue
    o.set({
      selectable: linksToolActive,
      evented: linksToolActive,
      hasControls: linksToolActive,
      hasBorders: linksToolActive,
    })
    o.setCoords()
  }
  if (!linksToolActive && isPdfLinkObject(canvas.getActiveObject())) {
    canvas.discardActiveObject()
  }
  canvas.requestRenderAll()
}

export function fabricLinkToNormalized(
  o: FabricObject,
  canvasW: number,
  canvasH: number,
): { position: { x: number; y: number }; size: { w: number; h: number } } {
  const left = o.left ?? 0
  const top = o.top ?? 0
  const w = o.getScaledWidth()
  const h = o.getScaledHeight()
  return {
    position: { x: left / canvasW, y: top / canvasH },
    size: { w: w / canvasW, h: h / canvasH },
  }
}

export function addPdfLinksToCanvas(
  canvas: Canvas,
  links: PdfLinkEntry[],
  page: number,
  canvasW: number,
  canvasH: number,
  linksToolActive: boolean,
): void {
  const valid = new Set(links.filter((l) => l.page === page).map((l) => l.id))
  for (const o of [...canvas.getObjects()]) {
    if (!isPdfLinkObject(o)) continue
    const id = getPdfLinkId(o)
    if (id && !valid.has(id)) {
      canvas.remove(o)
    }
  }
  for (const entry of links) {
    if (entry.page !== page) continue
    const existing = canvas
      .getObjects()
      .find((o) => getPdfLinkId(o) === entry.id)
    if (existing) {
      const r = existing as Rect
      r.set({
        scaleX: 1,
        scaleY: 1,
        left: entry.position.x * canvasW,
        top: entry.position.y * canvasH,
        width: Math.max(2, entry.size.w * canvasW),
        height: Math.max(2, entry.size.h * canvasH),
        ...PDF_LINK_RECT_STYLE,
        selectable: linksToolActive,
        evented: linksToolActive,
        hasControls: linksToolActive,
        hasBorders: linksToolActive,
      })
      r.setCoords()
      continue
    }
    const r = createFabricPdfLink(entry, canvasW, canvasH, linksToolActive)
    canvas.add(r)
    canvas.bringObjectToFront(r)
  }
  canvas.requestRenderAll()
}
