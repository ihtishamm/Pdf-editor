import { type PDFDocument, PDFString } from 'pdf-lib'
import type { PdfLinkEntry } from '../types/pdfLinks'

function linkRectPdf(
  left: number,
  top: number,
  width: number,
  height: number,
  pageH: number,
): [number, number, number, number] {
  /** PDF /Rect: [llx, lly, urx, ury] in user space (origin bottom-left). */
  const llx = left
  const lly = pageH - (top + height)
  const urx = left + width
  const ury = pageH - top
  return [llx, lly, urx, ury]
}

function buildUriString(link: PdfLinkEntry): string | null {
  const v = link.value.trim()
  if (!v) return null
  if (link.linkType === 'url') {
    if (/^https?:\/\//i.test(v) || /^mailto:/i.test(v) || /^tel:/i.test(v)) {
      return v
    }
    return `https://${v}`
  }
  if (link.linkType === 'email') {
    const addr = v.replace(/^mailto:/i, '')
    return `mailto:${addr}`
  }
  if (link.linkType === 'phone') {
    const num = v.replace(/^tel:/i, '')
    return `tel:${num}`
  }
  return null
}

/**
 * Adds PDF link annotations using pdf-lib `context.obj` + `page.node.addAnnot`.
 * URI actions for url/email/phone; GoTo for internal page targets.
 */
export function applyPdfLinksToPdfDocument(
  pdfDoc: PDFDocument,
  links: PdfLinkEntry[],
): void {
  const pages = pdfDoc.getPages()
  const ctx = pdfDoc.context

  for (const link of links) {
    const page = pages[link.page - 1]
    if (!page) continue
    const { width: pw, height: ph } = page.getSize()
    const left = link.position.x * pw
    const top = link.position.y * ph
    const width = link.size.w * pw
    const height = link.size.h * ph
    if (width < 1 || height < 1) continue

    const rect = linkRectPdf(left, top, width, height, ph)

    if (link.linkType === 'page') {
      const n = parseInt(link.value.trim(), 10)
      if (!Number.isFinite(n) || n < 1 || n > pages.length) continue
      const destPage = pages[n - 1]
      if (!destPage) continue
      const annotDict = ctx.obj({
        Type: 'Annot',
        Subtype: 'Link',
        Rect: rect,
        Border: [0, 0, 0],
        A: {
          Type: 'Action',
          S: 'GoTo',
          D: [destPage.ref, 'Fit'],
        },
      })
      page.node.addAnnot(ctx.register(annotDict))
    } else {
      const uri = buildUriString(link)
      if (!uri) continue
      const annotDict = ctx.obj({
        Type: 'Annot',
        Subtype: 'Link',
        Rect: rect,
        Border: [0, 0, 0],
        A: {
          Type: 'Action',
          S: 'URI',
          URI: PDFString.of(uri),
        },
      })
      page.node.addAnnot(ctx.register(annotDict))
    }
  }
}
