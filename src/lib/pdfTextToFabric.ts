import { Canvas, IText } from 'fabric'
import type { PDFPageProxy, PageViewport } from 'pdfjs-dist'
import { pdfTextItemToPdfBounds } from './pdfTextGeometry'

/** Inferred from PDF.js `getTextContent()` — avoids importing non-exported API types. */
export type PdfTextContent = Awaited<ReturnType<PDFPageProxy['getTextContent']>>
export type PdfTextItem = Extract<PdfTextContent['items'][number], { str: string }>

/** PDF.js text layer item (excludes TextMarkedContent entries). */
export function isTextItem(item: unknown): item is PdfTextItem {
  return (
    typeof item === 'object' &&
    item !== null &&
    'str' in item &&
    typeof (item as PdfTextItem).str === 'string' &&
    'transform' in item &&
    Array.isArray((item as PdfTextItem).transform)
  )
}

/**
 * Text runs use a 2×3 transform [a,b,c,d,e,f] in PDF user space (origin bottom-left).
 * `viewport.convertToViewportPoint` maps PDF user space → canvas pixels (origin top-left).
 *
 * Font size in CSS pixels: length of the vertical glyph vector (columns c,d) after mapping
 * through the viewport, matching PDF.js text-layer behavior.
 */
export function pdfTextItemToItextOptions(
  item: PdfTextItem,
  viewport: PageViewport,
  styles: PdfTextContent['styles'],
): ConstructorParameters<typeof IText>[1] {
  const m = item.transform as number[]
  const e = m[4]!
  const f = m[5]!

  const pBase = viewport.convertToViewportPoint(e, f) as [number, number]
  const pVert = viewport.convertToViewportPoint(e + m[2]!, f + m[3]!) as [
    number,
    number,
  ]
  const fontSizePx = Math.max(
    4,
    Math.hypot(pVert[0] - pBase[0], pVert[1] - pBase[1]),
  )

  const angleDeg = (Math.atan2(m[1]!, m[0]!) * 180) / Math.PI

  const style = styles[item.fontName]
  const fontFamily = style?.fontFamily ?? 'sans-serif'

  return {
    left: pBase[0],
    top: pBase[1],
    originX: 'left',
    originY: 'bottom',
    fontSize: fontSizePx,
    angle: angleDeg,
    fontFamily,
    fontWeight: 'normal',
    fontStyle: 'normal',
    fill: '#111827',
    strokeWidth: 0,
    backgroundColor: 'transparent',
    editable: true,
    selectable: true,
    evented: true,
    objectCaching: false,
  }
}

export function pdfTextRunId(pageIndex1Based: number, runIndex: number): string {
  return `p${pageIndex1Based}-t${runIndex}`
}

/** Adds one Fabric IText per PDF text run (mask layer hides raster duplicate). */
export function addPdfTextItemsToCanvas(
  fabricCanvas: Canvas,
  textContent: PdfTextContent,
  viewport: PageViewport,
  pageIndex1Based: number,
): void {
  let runIndex = 0
  for (const item of textContent.items) {
    if (!isTextItem(item)) continue
    if (!item.str.trim()) continue

    const opts = pdfTextItemToItextOptions(item, viewport, textContent.styles)
    const originalPdfBounds = pdfTextItemToPdfBounds(item)
    const runId = pdfTextRunId(pageIndex1Based, runIndex)
    runIndex += 1

    const text = new IText(item.str, {
      ...opts,
      data: {
        pdfTextSource: true as const,
        runId,
        originalPdfBounds,
      },
    })

    fabricCanvas.add(text)
  }
  fabricCanvas.requestRenderAll()
}
