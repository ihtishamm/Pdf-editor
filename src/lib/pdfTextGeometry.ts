import type { PageViewport } from 'pdfjs-dist'
import type { PdfTextItem } from './pdfTextToFabric'
import type { PdfNativeTextOriginalBounds } from '../types/pdfNativeText'

const PDF_BOUNDS_PAD = 0.75

export function pdfTextItemToPdfBounds(item: PdfTextItem): PdfNativeTextOriginalBounds {
  const m = item.transform as number[]
  const a = m[0]!
  const b = m[1]!
  const c = m[2]!
  const d = m[3]!
  const e = m[4]!
  const f = m[5]!
  const w = item.width
  const h = item.height
  const corners: [number, number][] = [
    [0, 0],
    [w, 0],
    [w, h],
    [0, h],
  ]
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const [tx, ty] of corners) {
    const x = a * tx + c * ty + e
    const y = b * tx + d * ty + f
    minX = Math.min(minX, x)
    minY = Math.min(minY, y)
    maxX = Math.max(maxX, x)
    maxY = Math.max(maxY, y)
  }
  return { minX, minY, maxX, maxY }
}

export function padPdfBounds(
  b: PdfNativeTextOriginalBounds,
  pad = PDF_BOUNDS_PAD,
): PdfNativeTextOriginalBounds {
  return {
    minX: b.minX - pad,
    minY: b.minY - pad,
    maxX: b.maxX + pad,
    maxY: b.maxY + pad,
  }
}

/** Viewport pixel rect (top-left origin) covering PDF bounds on the page. */
export function pdfBoundsToViewportRect(
  bounds: PdfNativeTextOriginalBounds,
  viewport: PageViewport,
): { left: number; top: number; width: number; height: number } {
  const pts = [
    viewport.convertToViewportPoint(bounds.minX, bounds.minY) as [number, number],
    viewport.convertToViewportPoint(bounds.maxX, bounds.minY) as [number, number],
    viewport.convertToViewportPoint(bounds.maxX, bounds.maxY) as [number, number],
    viewport.convertToViewportPoint(bounds.minX, bounds.maxY) as [number, number],
  ]
  const xs = pts.map((p) => p[0])
  const ys = pts.map((p) => p[1])
  const left = Math.min(...xs)
  const right = Math.max(...xs)
  const top = Math.min(...ys)
  const bottom = Math.max(...ys)
  return {
    left,
    top,
    width: Math.max(1, right - left),
    height: Math.max(1, bottom - top),
  }
}
