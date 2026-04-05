import type { Canvas, FabricObject } from 'fabric'
import {
  assignFabricHistoryId,
  enlivenFabricObjectFromSnapshot,
  findObjectByHistoryId,
  getFabricHistoryId,
  serializeFabricObjectForHistory,
} from './fabricHistoryHelpers'
import type { HistoryEntry } from '../types/fabricHistory'

type ObjectWithData = FabricObject & {
  data?: { fabricHistoryId?: string }
}

/**
 * Restores geometry/style from a snapshot without `target.set(serialized)`.
 * Fabric v7 serialized objects include nested structures whose `type` is
 * read-only when applied via `set()`, which throws (e.g. underlines, groups).
 */
async function applySnapshotToObject(
  canvas: Canvas,
  target: FabricObject,
  snapshotJson: string,
): Promise<void> {
  const preserveId = getFabricHistoryId(target)
  const fresh = await enlivenFabricObjectFromSnapshot(snapshotJson)
  const idx = canvas.getObjects().indexOf(target)
  const wasActive = canvas.getActiveObject() === target

  canvas.remove(target)
  target.dispose()

  const o = fresh as ObjectWithData
  if (!o.data) o.data = {}
  if (preserveId) {
    o.data.fabricHistoryId = preserveId
  }

  if (idx >= 0) {
    canvas.insertAt(idx, fresh)
  } else {
    canvas.add(fresh)
  }

  if (wasActive) {
    canvas.setActiveObject(fresh)
  }
  fresh.setCoords()
  canvas.requestRenderAll()
}

export async function revertSingleHistoryEntry(
  entry: HistoryEntry,
  canvas: Canvas | undefined,
): Promise<void> {
  if (!canvas) return

  if (entry.action === 'add') {
    const o = findObjectByHistoryId(canvas, entry.fabricObjectId)
    if (o) {
      canvas.remove(o)
      canvas.requestRenderAll()
    }
    return
  }

  if (entry.action === 'modify') {
    const o = findObjectByHistoryId(canvas, entry.fabricObjectId)
    if (o) {
      await applySnapshotToObject(canvas, o, entry.snapshot)
    }
    return
  }

  if (entry.action === 'delete') {
    const existing = findObjectByHistoryId(canvas, entry.fabricObjectId)
    if (existing) return
    const obj = await enlivenFabricObjectFromSnapshot(entry.snapshot)
    assignFabricHistoryId(obj)
    const d = (obj as ObjectWithData).data
    if (d) d.fabricHistoryId = entry.fabricObjectId
    canvas.add(obj)
    canvas.bringObjectToFront(obj)
    canvas.requestRenderAll()
  }
}

/**
 * Reverts entries in order (call with newest-first list).
 * Caller should run inside {@link fabricHistoryRuntime.runSuppressedAsync}.
 */
export async function revertHistoryEntries(
  entriesInRevertOrder: HistoryEntry[],
  fabricByPage: Map<number, Canvas>,
): Promise<void> {
  for (const entry of entriesInRevertOrder) {
    const canvas = fabricByPage.get(entry.pageNumber)
    await revertSingleHistoryEntry(entry, canvas)
  }
}

/** After revert, caller may need to refresh last-serialized state for remaining objects. */
export function snapshotForObject(obj: FabricObject): string {
  return serializeFabricObjectForHistory(obj)
}
