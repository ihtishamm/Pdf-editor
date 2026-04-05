import type { Canvas, FabricObject } from 'fabric'
import { util } from 'fabric'
import { isFormGhostObject } from './fabricFormField'
import type { HistoryEntry, HistoryFabricType } from '../types/fabricHistory'

export const FABRIC_HISTORY_SERIALIZE_PROPS = ['data'] as const

type ObjectWithData = FabricObject & {
  data?: {
    pdfTextSource?: boolean
    skipFabricHistory?: boolean
    dragPreview?: boolean
    fabricHistoryType?: HistoryFabricType
    fabricHistoryLabel?: string
    fabricHistoryId?: string
  }
}

export function assignFabricHistoryId(obj: FabricObject): string {
  const o = obj as ObjectWithData
  if (!o.data) o.data = {}
  if (!o.data.fabricHistoryId) {
    o.data.fabricHistoryId = crypto.randomUUID()
  }
  return o.data.fabricHistoryId
}

export function getFabricHistoryId(obj: FabricObject): string | null {
  const id = (obj as ObjectWithData).data?.fabricHistoryId
  return id ?? null
}

export function shouldRecordFabricHistory(obj: FabricObject | undefined): boolean {
  if (!obj) return false
  const d = (obj as ObjectWithData).data
  if (!d) return false
  if (d.pdfTextSource) return false
  if (d.skipFabricHistory) return false
  if (d.dragPreview) return false
  if (isFormGhostObject(obj)) return false
  return !!d.fabricHistoryType
}

/** Call after user finalizes a drag-created object (temp used dragPreview). */
export function markFabricHistoryUser(
  obj: FabricObject,
  type: HistoryFabricType,
  label: string,
): string {
  const o = obj as ObjectWithData
  if (!o.data) o.data = {}
  o.data.dragPreview = false
  o.data.fabricHistoryType = type
  o.data.fabricHistoryLabel = label
  o.data.skipFabricHistory = false
  return assignFabricHistoryId(obj)
}

export function serializeFabricObjectForHistory(obj: FabricObject): string {
  const plain = obj.toObject([...FABRIC_HISTORY_SERIALIZE_PROPS])
  return JSON.stringify(plain)
}

export function inferHistoryTypeFromData(obj: FabricObject): HistoryFabricType | null {
  return (obj as ObjectWithData).data?.fabricHistoryType ?? null
}

export function inferHistoryLabel(obj: FabricObject): string {
  return (obj as ObjectWithData).data?.fabricHistoryLabel ?? 'Edit'
}

export async function enlivenFabricObjectFromSnapshot(
  snapshot: string,
): Promise<FabricObject> {
  const parsed = JSON.parse(snapshot) as Record<string, unknown>
  const enlived = await util.enlivenObjects<FabricObject>([parsed], {})
  const obj = enlived[0]
  if (!obj) {
    throw new Error('fabricHistory: empty enliven result')
  }
  return obj
}

export function findObjectByHistoryId(
  canvas: Canvas,
  fabricObjectId: string,
): FabricObject | undefined {
  return canvas.getObjects().find((o) => getFabricHistoryId(o) === fabricObjectId)
}

export function defaultLabelForShapeData(obj: FabricObject): string {
  const d = (obj as ObjectWithData).data
  const v = d && 'variant' in d ? String((d as { variant?: string }).variant) : ''
  if (v === 'circle') return 'Ellipse'
  if (v === 'line') return 'Line'
  if (v === 'arrow') return 'Arrow'
  if (v === 'rectangle') return 'Rectangle'
  return 'Shape'
}

export function defaultLabelForAnnotate(obj: FabricObject): string {
  const d = (obj as ObjectWithData).data
  const v = d && 'variant' in d ? String((d as { variant?: string }).variant) : ''
  if (v === 'highlight') return 'Highlight'
  if (v === 'underline') return 'Underline'
  if (v === 'strike') return 'Strikethrough'
  return 'Annotation'
}

export function historyEntryLabel(e: HistoryEntry): string {
  return e.label
}
