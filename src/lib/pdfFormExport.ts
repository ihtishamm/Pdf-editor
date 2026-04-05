import { PDFDocument, StandardFonts } from 'pdf-lib'
import { applyPdfLinksToPdfDocument } from './pdfLinkExport'
import type { FormFieldMeta } from '../types/formFields'
import type { PdfLinkEntry } from '../types/pdfLinks'

function fieldRectPdf(
  f: FormFieldMeta,
  pageW: number,
  pageH: number,
): { x: number; y: number; width: number; height: number } {
  const x = f.position.x * pageW
  const width = f.size.w * pageW
  const height = f.size.h * pageH
  /** pdf-lib / PDF user space: origin bottom-left; y is the lower edge of the widget. */
  const y = pageH - (f.position.y + f.size.h) * pageH
  return { x, y, width, height }
}

function ensureUniqueName(base: string, used: Set<string>): string {
  const root = base.trim() || 'field'
  let n = root
  let i = 1
  while (used.has(n)) {
    n = `${root}_${i++}`
  }
  used.add(n)
  return n
}

/**
 * Embed AcroForm widgets + link annotations on an already-loaded document.
 * Call after drawing vector content so fields/links sit above it.
 */
export async function applyAcroFormFieldsAndLinks(
  pdfDoc: PDFDocument,
  fields: FormFieldMeta[],
  pdfLinks: PdfLinkEntry[] = [],
): Promise<void> {
  const form = pdfDoc.getForm()
  const pages = pdfDoc.getPages()
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica)

  const usedNames = new Set<string>()

  const radioClusters = new Map<string, FormFieldMeta[]>()
  for (const f of fields) {
    if (f.type !== 'radio') continue
    const key = f.radioGroupName
    const list = radioClusters.get(key) ?? []
    list.push(f)
    radioClusters.set(key, list)
  }

  const nonRadio = fields.filter((f) => f.type !== 'radio')
  for (const f of nonRadio) {
    const page = pages[f.page - 1]
    if (!page) continue
    const { width: pw, height: ph } = page.getSize()
    const rect = fieldRectPdf(f, pw, ph)
    const name = ensureUniqueName(f.name.replace(/[^\w.[\]-]/g, '_'), usedNames)

    if (f.type === 'text') {
      const tf = form.createTextField(name)
      if (f.required) tf.enableRequired()
      tf.addToPage(page, rect)
      continue
    }
    if (f.type === 'checkbox') {
      const cb = form.createCheckBox(name)
      if (f.required) cb.enableRequired()
      cb.addToPage(page, rect)
      continue
    }
    if (f.type === 'dropdown') {
      const dd = form.createDropdown(name)
      const opts = f.options.length ? f.options : ['']
      dd.addOptions(opts)
      if (f.required) dd.enableRequired()
      dd.addToPage(page, rect)
      continue
    }
    if (f.type === 'button') {
      const btn = form.createButton(name)
      btn.addToPage(f.buttonLabel || 'Button', page, rect)
    }
  }

  for (const [, list] of radioClusters) {
    const sorted = [...list].sort((a, b) => {
      if (a.page !== b.page) return a.page - b.page
      return a.radioOptionId.localeCompare(b.radioOptionId)
    })
    const groupBase = sorted[0]?.radioGroupName ?? 'radio'
    const gName = ensureUniqueName(
      `rg_${groupBase.replace(/[^\w.[\]-]/g, '_')}`,
      usedNames,
    )
    const rg = form.createRadioGroup(gName)
    for (const f of sorted) {
      const page = pages[f.page - 1]
      if (!page) continue
      const { width: pw, height: ph } = page.getSize()
      const rect = fieldRectPdf(f, pw, ph)
      rg.addOptionToPage(f.radioOptionId, page, rect)
    }
  }

  form.updateFieldAppearances(font)
  if (pdfLinks.length) {
    applyPdfLinksToPdfDocument(pdfDoc, pdfLinks)
  }
}

/**
 * Load the original PDF bytes and embed AcroForm widgets matching editor metadata.
 */
export async function exportPdfWithFormFields(
  sourceBytes: Uint8Array,
  fields: FormFieldMeta[],
  pdfLinks: PdfLinkEntry[] = [],
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(sourceBytes, { ignoreEncryption: true })
  await applyAcroFormFieldsAndLinks(pdfDoc, fields, pdfLinks)
  return pdfDoc.save()
}
