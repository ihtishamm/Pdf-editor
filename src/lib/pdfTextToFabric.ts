import { Canvas, IText } from 'fabric'
import type { PDFPageProxy, PageViewport } from 'pdfjs-dist'

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
    fill: 'rgba(0,0,0,0.04)',
    strokeWidth: 0,
    backgroundColor: 'transparent',
    editable: true,
    selectable: true,
    evented: true,
    objectCaching: false,
    data: { pdfTextSource: true as const },
  }
}

/** Adds one Fabric IText per PDF text run; invisible fill until user edits. */
export function addPdfTextItemsToCanvas(
  fabricCanvas: Canvas,
  textContent: PdfTextContent,
  viewport: PageViewport,
): void {
  for (const item of textContent.items) {
    if (!isTextItem(item)) continue
    if (!item.str.trim()) continue

    const opts = pdfTextItemToItextOptions(item, viewport, textContent.styles)
    const text = new IText(item.str, opts)

    text.on('editing:entered', () => {
      const fill = text.fill
      if (typeof fill === 'string' && fill.startsWith('rgba(0,0,0,0')) {
        text.set({ fill: '#111827' })
        fabricCanvas.requestRenderAll()
      }
    })

    fabricCanvas.add(text)
  }
  fabricCanvas.requestRenderAll()
}
