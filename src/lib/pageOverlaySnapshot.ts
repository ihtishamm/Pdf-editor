import type { Canvas, FabricObject } from 'fabric'
import { Line, util } from 'fabric'
import { fabricHistoryRuntime } from './fabricHistoryRuntime'
import { isFormFieldObject } from './fabricFormField'
import { isPdfLinkObject } from './fabricPdfLink'

/** Serialized user-drawn overlay for one page (excludes PDF text layer, AcroForm, link rects). */
export type PageOverlaySnapshot = {
  width: number
  height: number
  objects: Record<string, unknown>[]
}

export function shouldPersistOverlayObject(o: FabricObject): boolean {
  if (!o.visible) return false
  const d = (o as FabricObject & { data?: { pdfTextSource?: boolean } }).data
  if (d?.pdfTextSource) return false
  if (isFormFieldObject(o)) return false
  if (isPdfLinkObject(o)) return false
  return true
}

export function capturePageOverlay(canvas: Canvas): PageOverlaySnapshot {
  const width = canvas.getWidth()
  const height = canvas.getHeight()
  const objects = canvas
    .getObjects()
    .filter(shouldPersistOverlayObject)
    .map((o) => o.toObject())
  return { width, height, objects }
}

/**
 * Scale restored objects when the Fabric viewport size changed (e.g. zoom / resize).
 */
export function scaleOverlaySpatialProps(
  o: FabricObject,
  fx: number,
  fy: number,
): void {
  o.set({
    left: (o.left ?? 0) * fx,
    top: (o.top ?? 0) * fy,
    scaleX: (o.scaleX ?? 1) * fx,
    scaleY: (o.scaleY ?? 1) * fy,
  })
  const ext = o as FabricObject & {
    fontSize?: number
    strokeWidth?: number
    width?: number
    height?: number
  }
  if (typeof ext.fontSize === 'number') {
    o.set({ fontSize: ext.fontSize * Math.min(fx, fy) })
  }
  if (typeof ext.strokeWidth === 'number') {
    o.set({ strokeWidth: ext.strokeWidth * Math.min(fx, fy) })
  }
  if (o instanceof Line) {
    const ln = o as Line & { x1?: number; y1?: number; x2?: number; y2?: number }
    o.set({
      x1: (ln.x1 ?? 0) * fx,
      y1: (ln.y1 ?? 0) * fy,
      x2: (ln.x2 ?? 0) * fx,
      y2: (ln.y2 ?? 0) * fy,
    })
  }
  o.setCoords()
}

export async function applyPageOverlayToCanvas(
  canvas: Canvas,
  snapshot: PageOverlaySnapshot | undefined | null,
): Promise<void> {
  if (!snapshot?.objects.length) return
  const nw = canvas.getWidth()
  const nh = canvas.getHeight()
  const fx = nw / snapshot.width
  const fy = nh / snapshot.height
  const objs = await util.enlivenObjects<FabricObject>(
    snapshot.objects as never[],
    {},
  )
  fabricHistoryRuntime.runSuppressed(() => {
    for (const o of objs) {
      if (Math.abs(fx - 1) > 0.001 || Math.abs(fy - 1) > 0.001) {
        scaleOverlaySpatialProps(o, fx, fy)
      }
      canvas.add(o)
    }
    canvas.requestRenderAll()
  })
}
