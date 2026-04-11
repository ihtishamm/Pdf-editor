import type { Canvas, FabricObject } from 'fabric'
import {
  Canvas as FabricCanvas,
  Ellipse,
  FabricImage,
  IText,
  Line,
  Path,
  Point,
  Rect,
  util,
} from 'fabric'
import type { PDFFont, PDFPage } from 'pdf-lib'
import { PDFDocument, StandardFonts, degrees, rgb } from 'pdf-lib'
import { isFormFieldObject } from './fabricFormField'
import { isPdfLinkObject } from './fabricPdfLink'
import type { PageOverlaySnapshot } from './pageOverlaySnapshot'
import { padPdfBounds } from './pdfTextGeometry'
import type { PdfNativeTextRunState } from '../types/pdfNativeText'

type FabricFonts = {
  helvetica: PDFFont
  helveticaBold: PDFFont
  timesRoman: PDFFont
  courier: PDFFont
}

function fabricRectToPdf(
  left: number,
  top: number,
  w: number,
  h: number,
  cw: number,
  ch: number,
  pw: number,
  ph: number,
): { x: number; y: number; w: number; h: number } {
  const sx = pw / cw
  const sy = ph / ch
  return {
    x: left * sx,
    y: ph - (top + h) * sy,
    w: w * sx,
    h: h * sy,
  }
}

function parseHexColor(
  fill: unknown,
): { r: number; g: number; b: number } | null {
  if (typeof fill !== 'string') return null
  const s = fill.trim()
  const m = s.match(/^#([0-9a-fA-F]{6})$/)
  if (!m) return null
  const n = parseInt(m[1]!, 16)
  return {
    r: ((n >> 16) & 255) / 255,
    g: ((n >> 8) & 255) / 255,
    b: (n & 255) / 255,
  }
}

function parseColorOr(
  fill: unknown,
  fallback: { r: number; g: number; b: number },
): { r: number; g: number; b: number } {
  return parseHexColor(fill) ?? fallback
}

function pickStandardFont(
  fontFamily: string,
  bold: boolean,
  fonts: FabricFonts,
): PDFFont {
  const f = fontFamily.toLowerCase()
  if (bold) return fonts.helveticaBold
  if (f.includes('times') || f.includes('serif')) return fonts.timesRoman
  if (f.includes('courier') || f.includes('mono')) return fonts.courier
  if (
    f.includes('arial') ||
    f.includes('helvetica') ||
    f.includes('sans-serif') ||
    f.includes('system-ui')
  ) {
    return fonts.helvetica
  }
  return fonts.helvetica
}

function pathSvgD(path: Path): string {
  const svg = path.toSVG()
  const m = svg.match(/d="([^"]+)"/)
  return m?.[1]?.trim() ? m[1]! : 'M0 0'
}

function dataUrlToPngBytes(dataUrl: string): Uint8Array {
  const i = dataUrl.indexOf('base64,')
  if (i < 0) throw new Error('export: expected PNG data URL')
  const b64 = dataUrl.slice(i + 'base64,'.length)
  const bin = atob(b64)
  const out = new Uint8Array(bin.length)
  for (let k = 0; k < bin.length; k++) out[k] = bin.charCodeAt(k)
  return out
}

async function drawFabricImageOnPage(
  pdfDoc: PDFDocument,
  page: PDFPage,
  img: FabricImage,
  cw: number,
  ch: number,
  pw: number,
  ph: number,
): Promise<void> {
  const dataUrl = img.toDataURL({ format: 'png', multiplier: 1 })
  const bytes = dataUrlToPngBytes(dataUrl)
  const png = await pdfDoc.embedPng(bytes)
  const br = img.getBoundingRect()
  const r = fabricRectToPdf(br.left, br.top, br.width, br.height, cw, ch, pw, ph)
  page.drawImage(png, {
    x: r.x,
    y: r.y,
    width: r.w,
    height: r.h,
    rotate: degrees(img.angle ?? 0),
    opacity: img.opacity ?? 1,
  })
}

export async function embedStandardFabricFonts(
  pdfDoc: PDFDocument,
): Promise<FabricFonts> {
  const [helvetica, helveticaBold, timesRoman, courier] = await Promise.all([
    pdfDoc.embedFont(StandardFonts.Helvetica),
    pdfDoc.embedFont(StandardFonts.HelveticaBold),
    pdfDoc.embedFont(StandardFonts.TimesRoman),
    pdfDoc.embedFont(StandardFonts.Courier),
  ])
  return { helvetica, helveticaBold, timesRoman, courier }
}

type PdfTextData = {
  pdfTextSource?: boolean
  tool?: string
  originalPdfBounds?: PdfNativeTextRunState['originalPdfBounds']
}

function drawFabricITextOnPdfPage(
  page: PDFPage,
  obj: IText,
  cw: number,
  ch: number,
  fonts: FabricFonts,
): void {
  const { width: pw, height: ph } = page.getSize()
  const text = obj.text ?? ''
  if (!text.trim()) return
  const br = obj.getBoundingRect()
  const r = fabricRectToPdf(
    br.left,
    br.top,
    br.width,
    br.height,
    cw,
    ch,
    pw,
    ph,
  )
  const fs = (obj.fontSize ?? 12) * (obj.scaleY ?? 1) * (ph / ch)
  const col = parseColorOr(obj.fill, { r: 0.07, g: 0.09, b: 0.15 })
  const bold =
    obj.fontWeight === 'bold' ||
    obj.fontWeight === 700 ||
    obj.fontWeight === '700'
  const font = pickStandardFont(String(obj.fontFamily ?? ''), bold, fonts)
  page.drawText(text, {
    x: r.x,
    y: r.y,
    size: Math.max(4, fs),
    font,
    color: rgb(col.r, col.g, col.b),
    rotate: degrees(obj.angle ?? 0),
    opacity: obj.opacity ?? 1,
  })
}

export async function drawStoredPdfNativeTextOnPdfPage(
  page: PDFPage,
  runs: Map<string, PdfNativeTextRunState> | undefined,
  fonts: FabricFonts,
): Promise<void> {
  if (!runs?.size) return
  const { width: pw, height: ph } = page.getSize()
  const el = document.createElement('canvas')
  const tmp = new FabricCanvas(el, {
    width: pw,
    height: ph,
  })
  try {
    for (const state of runs.values()) {
      const b = padPdfBounds(state.originalPdfBounds)
      page.drawRectangle({
        x: b.minX,
        y: b.minY,
        width: b.maxX - b.minX,
        height: b.maxY - b.minY,
        color: rgb(1, 1, 1),
        borderWidth: 0,
      })

      const fontStyle =
        state.fontStyle === 'italic' || state.fontStyle === 'oblique'
          ? 'italic'
          : 'normal'
      const t = new IText(state.text, {
        left: state.relLeft * pw,
        top: state.relTop * ph,
        fontSize: state.relFontSize * ph,
        angle: state.angle,
        scaleX: state.scaleX,
        scaleY: state.scaleY,
        fontFamily: state.fontFamily,
        fill: state.fill,
        fontWeight: state.fontWeight,
        fontStyle,
        originX: 'left',
        originY: 'bottom',
        objectCaching: false,
      })
      tmp.add(t)
      drawFabricITextOnPdfPage(page, t, pw, ph, fonts)
      tmp.remove(t)
    }
  } finally {
    await tmp.dispose()
  }
}

/** Draws exportable overlay objects (same filters as live canvas export). */
async function drawExportableFabricObjectsOnPdfPage(
  pdfDoc: PDFDocument,
  page: PDFPage,
  objects: FabricObject[],
  cw: number,
  ch: number,
  fonts: FabricFonts,
): Promise<void> {
  const { width: pw, height: ph } = page.getSize()

  for (const obj of objects) {
      if (!obj.visible) continue

      const d = (obj as { data?: PdfTextData }).data
      if (isPdfLinkObject(obj)) continue
      if (isFormFieldObject(obj)) continue
      if (d?.tool === 'commentPin') continue

      if (obj instanceof IText) {
        if (d?.pdfTextSource && d.originalPdfBounds) {
          const wb = padPdfBounds(d.originalPdfBounds)
          page.drawRectangle({
            x: wb.minX,
            y: wb.minY,
            width: wb.maxX - wb.minX,
            height: wb.maxY - wb.minY,
            color: rgb(1, 1, 1),
            borderWidth: 0,
          })
        }
        drawFabricITextOnPdfPage(page, obj, cw, ch, fonts)
        continue
      }

      if (obj instanceof Rect) {
        const tool = d?.tool
        const br = obj.getBoundingRect()
        const r = fabricRectToPdf(
          br.left,
          br.top,
          br.width,
          br.height,
          cw,
          ch,
          pw,
          ph,
        )

        if (tool === 'whiteout') {
          page.drawRectangle({
            x: r.x,
            y: r.y,
            width: r.w,
            height: r.h,
            color: rgb(1, 1, 1),
            borderWidth: 0,
          })
          continue
        }

        if (tool === 'shape' && d && 'variant' in d && d.variant === 'rectangle') {
          const fill = obj.fill
          const stroke = obj.stroke
          const sw = (obj.strokeWidth ?? 1) * (pw / cw)
          page.drawRectangle({
            x: r.x,
            y: r.y,
            width: r.w,
            height: r.h,
            color:
              typeof fill === 'string' && fill !== 'transparent'
                ? rgb(
                    parseColorOr(fill, { r: 0, g: 0, b: 0 }).r,
                    parseColorOr(fill, { r: 0, g: 0, b: 0 }).g,
                    parseColorOr(fill, { r: 0, g: 0, b: 0 }).b,
                  )
                : undefined,
            opacity:
              typeof fill === 'string' && fill !== 'transparent'
                ? (obj.opacity ?? 1)
                : undefined,
            borderColor: (() => {
              const c = parseColorOr(stroke, { r: 0.12, g: 0.16, b: 0.21 })
              return rgb(c.r, c.g, c.b)
            })(),
            borderWidth: sw,
            borderOpacity: obj.opacity ?? 1,
            rotate: degrees(obj.angle ?? 0),
          })
          continue
        }

        if (tool === 'annotate' && d && 'variant' in d) {
          const v = String(d.variant)
          if (v === 'highlight') {
            page.drawRectangle({
              x: r.x,
              y: r.y,
              width: r.w,
              height: r.h,
              color: rgb(1, 1, 0),
              opacity: 0.5,
              borderWidth: 0,
            })
          }
          continue
        }
      }

      if (obj instanceof Line) {
        const m = obj.calcTransformMatrix()
        const lp = obj.calcLinePoints()
        const p1 = util.transformPoint(new Point(lp.x1, lp.y1), m)
        const p2 = util.transformPoint(new Point(lp.x2, lp.y2), m)
        const sx = pw / cw
        const sy = ph / ch
        const x1 = p1.x * sx
        const y1 = ph - p1.y * sy
        const x2 = p2.x * sx
        const y2 = ph - p2.y * sy
        const stroke = parseColorOr(obj.stroke, { r: 0.15, g: 0.35, b: 0.9 })
        const th = Math.max(0.5, (obj.strokeWidth ?? 1) * Math.min(sx, sy))
        page.drawLine({
          start: { x: x1, y: y1 },
          end: { x: x2, y: y2 },
          thickness: th,
          color: rgb(stroke.r, stroke.g, stroke.b),
          opacity: obj.opacity ?? 1,
        })
        continue
      }

      if (obj instanceof Ellipse) {
        const br = obj.getBoundingRect()
        const cx = (br.left + br.width / 2) * (pw / cw)
        const cy = ph - (br.top + br.height / 2) * (ph / ch)
        const rx = (br.width / 2) * (pw / cw)
        const ry = (br.height / 2) * (ph / ch)
        const fill = obj.fill
        const stroke = obj.stroke
        const sw = (obj.strokeWidth ?? 1) * (pw / cw)
        page.drawEllipse({
          x: cx,
          y: cy,
          xScale: Math.max(1, rx),
          yScale: Math.max(1, ry),
          color:
            typeof fill === 'string' && fill !== 'transparent'
              ? rgb(
                  parseColorOr(fill, { r: 0, g: 0, b: 0 }).r,
                  parseColorOr(fill, { r: 0, g: 0, b: 0 }).g,
                  parseColorOr(fill, { r: 0, g: 0, b: 0 }).b,
                )
              : undefined,
          opacity:
            typeof fill === 'string' && fill !== 'transparent'
              ? (obj.opacity ?? 1)
              : undefined,
          borderColor: (() => {
            const c = parseColorOr(stroke, { r: 0.12, g: 0.16, b: 0.21 })
            return rgb(c.r, c.g, c.b)
          })(),
          borderWidth: sw,
          rotate: degrees(obj.angle ?? 0),
        })
        continue
      }

      if (obj instanceof Path) {
        const tool = d?.tool
        const br = obj.getBoundingRect()
        const r = fabricRectToPdf(
          br.left,
          br.top,
          br.width,
          br.height,
          cw,
          ch,
          pw,
          ph,
        )
        const dStr = pathSvgD(obj)
        const stroke = parseColorOr(obj.stroke, { r: 0.12, g: 0.16, b: 0.21 })
        const sw = (obj.strokeWidth ?? 1) * (pw / cw)
        if (tool === 'shape' && d && 'variant' in d && d.variant === 'arrow') {
          page.drawSvgPath(dStr, {
            x: r.x,
            y: r.y,
            borderColor: rgb(stroke.r, stroke.g, stroke.b),
            borderWidth: sw,
            opacity: obj.opacity ?? 1,
          })
        } else {
          page.drawSvgPath(dStr, {
            x: r.x,
            y: r.y,
            borderColor: rgb(stroke.r, stroke.g, stroke.b),
            borderWidth: sw,
            opacity: obj.opacity ?? 1,
          })
        }
        continue
      }

      if (obj instanceof FabricImage) {
        await drawFabricImageOnPage(pdfDoc, page, obj, cw, ch, pw, ph)
      }
    }
}

/**
 * Rasterizes only individual Fabric images (signatures, placed images). Never the whole canvas.
 * Uses a live canvas when present; otherwise enlivens a stored {@link PageOverlaySnapshot}.
 */
export async function drawFabricOverlaysOnPdfPages(
  pdfDoc: PDFDocument,
  fabricByPage: Map<number, Canvas>,
  pageCount: number,
  fonts: FabricFonts,
  pageOverlaySnapshots?: Map<number, PageOverlaySnapshot>,
  pdfNativeTextByPage?: Map<number, Map<string, PdfNativeTextRunState>>,
): Promise<void> {
  const pages = pdfDoc.getPages()

  for (let pageIndex = 0; pageIndex < pageCount; pageIndex++) {
    const pageNum = pageIndex + 1
    const pdfPage = pages[pageIndex]
    if (!pdfPage) continue

    const live = fabricByPage.get(pageNum)
    if (live) {
      await drawExportableFabricObjectsOnPdfPage(
        pdfDoc,
        pdfPage,
        live.getObjects(),
        live.getWidth(),
        live.getHeight(),
        fonts,
      )
      continue
    }

    await drawStoredPdfNativeTextOnPdfPage(
      pdfPage,
      pdfNativeTextByPage?.get(pageNum),
      fonts,
    )

    const snap = pageOverlaySnapshots?.get(pageNum)
    if (!snap?.objects.length) continue

    const el = document.createElement('canvas')
    const tmp = new FabricCanvas(el, {
      width: snap.width,
      height: snap.height,
    })
    try {
      const revived = await util.enlivenObjects<FabricObject>(
        snap.objects as never[],
        {},
      )
      for (const o of revived) {
        tmp.add(o)
      }
      await drawExportableFabricObjectsOnPdfPage(
        pdfDoc,
        pdfPage,
        tmp.getObjects(),
        snap.width,
        snap.height,
        fonts,
      )
    } finally {
      await tmp.dispose()
    }
  }
}
