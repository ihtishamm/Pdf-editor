import {
  FabricText,
  FixedLayout,
  Group,
  LayoutManager,
  Rect,
  type Canvas,
  type FabricObject,
} from 'fabric'
import type { FormFieldMeta } from '../types/formFields'

const FORM_TOOL = 'formField' as const
export const FORM_GHOST_TOOL = 'formGhost' as const

type FormFieldData = { tool: typeof FORM_TOOL; fieldId: string }

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n))
}

/** Caption text drawn inside the widget (Sejda-style placeholder). */
export function formFieldInnerLabel(meta: FormFieldMeta): string {
  switch (meta.type) {
    case 'checkbox':
    case 'radio':
      return ''
    case 'button':
      return meta.buttonLabel || 'Button'
    case 'dropdown':
      return (
        meta.placeholder ||
        (meta.options[0] ? String(meta.options[0]) : '') ||
        'Select…'
      )
    case 'text':
    default:
      return meta.placeholder || 'Sample text'
  }
}

function fieldFill(meta: FormFieldMeta): string {
  if (meta.type === 'button') return '#f3f4f6'
  return '#ffffff'
}

export function formFieldMetaToPixels(
  meta: FormFieldMeta,
  canvasW: number,
  canvasH: number,
): { left: number; top: number; width: number; height: number } {
  return {
    left: meta.position.x * canvasW,
    top: meta.position.y * canvasH,
    width: Math.max(4, meta.size.w * canvasW),
    height: Math.max(4, meta.size.h * canvasH),
  }
}

function innerFontSize(meta: FormFieldMeta, boxH: number): number {
  const fs = meta.fontSize
  return Math.max(10, Math.min(fs, Math.floor(boxH * 0.55)))
}

function innerLabelLayout(width: number, height: number) {
  return {
    left: width / 2,
    top: height / 2,
    originX: 'center' as const,
    originY: 'center' as const,
    textAlign: 'center' as const,
  }
}

export function createFabricFormField(
  meta: FormFieldMeta,
  canvasW: number,
  canvasH: number,
): Group {
  const { left, top, width, height } = formFieldMetaToPixels(
    meta,
    canvasW,
    canvasH,
  )
  const r = Math.min(width, height) / 2
  /**
   * Fabric defaults originX/Y to `center`. With center origin, (0,0) is the rect’s
   * center, while the label is placed at (w/2, h/2) — the box’s bottom-right — so
   * text renders outside the stroke. Use top-left origin for the rect.
   */
  const rect = new Rect({
    left: 0,
    top: 0,
    width,
    height,
    originX: 'left',
    originY: 'top',
    fill: fieldFill(meta),
    stroke: meta.borderColor,
    strokeWidth: 1,
    rx: meta.type === 'radio' ? r : 3,
    ry: meta.type === 'radio' ? r : 3,
    objectCaching: false,
  })
  const labelText = formFieldInnerLabel(meta)
  const fs = innerFontSize(meta, height)
  const label = new FabricText(labelText, {
    ...innerLabelLayout(width, height),
    fontSize: fs,
    fill: meta.textColor,
    fontFamily: 'system-ui, -apple-system, sans-serif',
    objectCaching: false,
  })
  /**
   * Fabric v7 defaults to FitContentLayout, which recomputes the group bbox on
   * changes and shifts children — that pulls centered labels out of the rect.
   * FixedLayout + explicit size keeps rect + text aligned.
   */
  const g = new Group([rect, label], {
    left,
    top,
    width,
    height,
    originX: 'left',
    originY: 'top',
    subTargetCheck: true,
    objectCaching: false,
    layoutManager: new LayoutManager(new FixedLayout()),
  })
  const data: FormFieldData = { tool: FORM_TOOL, fieldId: meta.id }
  Object.assign(g, { data })
  return g
}

export function isFormFieldObject(o: FabricObject | undefined): boolean {
  if (!o) return false
  const d = (o as FabricObject & { data?: FormFieldData }).data
  return d?.tool === FORM_TOOL && typeof d.fieldId === 'string'
}

export function isFormGhostObject(o: FabricObject | undefined): boolean {
  if (!o) return false
  const d = (o as FabricObject & { data?: { tool?: string } }).data
  return d?.tool === FORM_GHOST_TOOL
}

export function getFormFieldId(o: FabricObject): string | null {
  const d = (o as FabricObject & { data?: FormFieldData }).data
  return d?.tool === FORM_TOOL && d.fieldId ? d.fieldId : null
}

export function addFormFieldsToCanvas(
  canvas: Canvas,
  fields: FormFieldMeta[],
  page: number,
  canvasW: number,
  canvasH: number,
): void {
  for (const f of fields) {
    if (f.page !== page) continue
    const g = createFabricFormField(f, canvasW, canvasH)
    g.set({
      selectable: true,
      evented: true,
      hasControls: true,
      hasBorders: true,
    })
    g.setCoords()
    canvas.add(g)
    canvas.bringObjectToFront(g)
  }
}

export function refreshFabricFormField(
  canvas: Canvas,
  meta: FormFieldMeta,
  canvasW: number,
  canvasH: number,
): void {
  const target = canvas
    .getObjects()
    .find(
      (o) => isFormFieldObject(o) && getFormFieldId(o) === meta.id,
    ) as Group | undefined
  if (!target) return

  const { left, top, width, height } = formFieldMetaToPixels(
    meta,
    canvasW,
    canvasH,
  )
  const rect = target.item(0) as Rect
  const label = target.item(1) as FabricText
  const r = Math.min(width, height) / 2
  rect.set({
    left: 0,
    top: 0,
    width,
    height,
    originX: 'left',
    originY: 'top',
    fill: fieldFill(meta),
    stroke: meta.borderColor,
    rx: meta.type === 'radio' ? r : 3,
    ry: meta.type === 'radio' ? r : 3,
  })
  const fs = innerFontSize(meta, height)
  label.set({
    text: formFieldInnerLabel(meta),
    fontSize: fs,
    fill: meta.textColor,
    ...innerLabelLayout(width, height),
  })
  target.set({ left, top, width, height, originX: 'left', originY: 'top' })
  target.setCoords()
  rect.setCoords()
  label.setCoords()
  canvas.requestRenderAll()
}

export function formFieldObjectToNormalized(
  obj: FabricObject,
  canvasW: number,
  canvasH: number,
): { position: { x: number; y: number }; size: { w: number; h: number } } {
  const br = obj.getBoundingRect()
  const nx = clamp(br.left / canvasW, 0, 1)
  const ny = clamp(br.top / canvasH, 0, 1)
  const nw = clamp(br.width / canvasW, 0.01, 1)
  const nh = clamp(br.height / canvasH, 0.01, 1)
  return {
    position: { x: nx, y: ny },
    size: { w: nw, h: nh },
  }
}
