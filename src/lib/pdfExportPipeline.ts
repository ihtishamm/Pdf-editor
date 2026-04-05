import type { Canvas } from 'fabric'
import { PDFDocument } from 'pdf-lib'
import { applyAcroFormFieldsAndLinks } from './pdfFormExport'
import {
  drawFabricOverlaysOnPdfPages,
  embedStandardFabricFonts,
} from './pdfExportFabricOverlays'
import type { FormFieldMeta } from '../types/formFields'
import type { PdfLinkEntry } from '../types/pdfLinks'
import type { PageOverlaySnapshot } from './pageOverlaySnapshot'
import { isLikelyPdfBytes } from './isLikelyPdfBytes'

export type ExportPdfPipelineResult = {
  bytes: Uint8Array
  blob: Blob
  filename: string
}

export { isLikelyPdfBytes } from './isLikelyPdfBytes'

/**
 * Full export: vector overlays from Fabric (per-page canvases in map), then AcroForm + link annotations.
 * Does not rasterize the overlay canvas as a single image.
 */
export async function runFullPdfExport(params: {
  originalFileBytes: Uint8Array
  fabricByPage: Map<number, Canvas>
  pageCount: number
  formFields: FormFieldMeta[]
  pdfLinks: PdfLinkEntry[]
  baseFileName: string
  pageOverlaySnapshots?: Map<number, PageOverlaySnapshot>
}): Promise<ExportPdfPipelineResult> {
  const {
    originalFileBytes,
    fabricByPage,
    pageCount,
    formFields,
    pdfLinks,
    baseFileName,
    pageOverlaySnapshots,
  } = params

  if (!isLikelyPdfBytes(originalFileBytes)) {
    throw new Error('Invalid or empty PDF bytes (missing %PDF- header).')
  }

  const pdfDoc = await PDFDocument.load(originalFileBytes, {
    ignoreEncryption: true,
  })

  const fonts = await embedStandardFabricFonts(pdfDoc)
  await drawFabricOverlaysOnPdfPages(
    pdfDoc,
    fabricByPage,
    pageCount,
    fonts,
    pageOverlaySnapshots,
  )
  await applyAcroFormFieldsAndLinks(pdfDoc, formFields, pdfLinks)

  const bytes = await pdfDoc.save()
  const blob = new Blob([new Uint8Array(bytes)], { type: 'application/pdf' })
  const stem = baseFileName.replace(/\.pdf$/i, '').trim() || 'document'
  const filename = `${stem}.pdf`

  return { bytes, blob, filename }
}
