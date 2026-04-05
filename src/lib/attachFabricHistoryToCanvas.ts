import type { Canvas, FabricObject, Transform } from 'fabric'
import { fabricHistoryRuntime } from './fabricHistoryRuntime'
import {
  assignFabricHistoryId,
  getFabricHistoryId,
  inferHistoryLabel,
  inferHistoryTypeFromData,
  markFabricHistoryUser,
  serializeFabricObjectForHistory,
  shouldRecordFabricHistory,
} from './fabricHistoryHelpers'
import type { HistoryEntry } from '../types/fabricHistory'

export type FabricHistoryPush = (
  entry: Omit<HistoryEntry, 'id' | 'timestamp'> & { timestamp?: Date },
) => void

/**
 * Tracks user edits via `before:transform`, `object:added`, `object:modified`, `object:removed`,
 * and `before:path:created` (free draw). PDF/programmatic fills must run under {@link fabricHistoryRuntime.runSuppressed}.
 */
export function attachFabricHistoryToCanvas(
  canvas: Canvas,
  getCurrentPage: () => number,
  pushEntry: FabricHistoryPush,
): {
  dispose: () => void
  manualRecordAdd: (obj: FabricObject) => void
} {
  const lastSerialized = new WeakMap<FabricObject, string>()
  const beforeTransformSnap = new WeakMap<FabricObject, string>()

  function manualRecordAdd(obj: FabricObject) {
    if (fabricHistoryRuntime.isSuppressed()) return
    if (!shouldRecordFabricHistory(obj)) return
    const fabricObjectId = getFabricHistoryId(obj)
    if (!fabricObjectId) return
    const snap = serializeFabricObjectForHistory(obj)
    lastSerialized.set(obj, snap)
    pushEntry({
      type: inferHistoryTypeFromData(obj)!,
      label: inferHistoryLabel(obj),
      pageNumber: getCurrentPage(),
      fabricObjectId,
      snapshot: snap,
      action: 'add',
    })
  }

  const onBeforePath = (opt: { path?: FabricObject }) => {
    const path = opt.path
    if (!path || fabricHistoryRuntime.isSuppressed()) return
    markFabricHistoryUser(path, 'shape', 'Draw')
  }

  const onBeforeTransform = (opt: { transform: Transform }) => {
    const target = opt.transform.target
    if (!target || fabricHistoryRuntime.isSuppressed()) return
    if (!shouldRecordFabricHistory(target)) return
    assignFabricHistoryId(target)
    beforeTransformSnap.set(target, serializeFabricObjectForHistory(target))
  }

  const onObjectAdded = (opt: { target?: FabricObject }) => {
    const target = opt.target
    if (!target || fabricHistoryRuntime.isSuppressed()) return
    if (!shouldRecordFabricHistory(target)) return
    const fabricObjectId = assignFabricHistoryId(target)
    const snap = serializeFabricObjectForHistory(target)
    lastSerialized.set(target, snap)
    pushEntry({
      type: inferHistoryTypeFromData(target)!,
      label: inferHistoryLabel(target),
      pageNumber: getCurrentPage(),
      fabricObjectId,
      snapshot: snap,
      action: 'add',
    })
  }

  const onObjectModified = (opt: { target?: FabricObject }) => {
    const target = opt.target
    if (!target || fabricHistoryRuntime.isSuppressed()) return
    if (!shouldRecordFabricHistory(target)) return
    const fabricObjectId = assignFabricHistoryId(target)
    const before =
      beforeTransformSnap.get(target) ?? lastSerialized.get(target)
    beforeTransformSnap.delete(target)
    if (!before) return
    const after = serializeFabricObjectForHistory(target)
    if (before === after) return
    pushEntry({
      type: inferHistoryTypeFromData(target)!,
      label: inferHistoryLabel(target),
      pageNumber: getCurrentPage(),
      fabricObjectId,
      snapshot: before,
      action: 'modify',
    })
    lastSerialized.set(target, after)
  }

  const onObjectRemoved = (opt: { target?: FabricObject }) => {
    const target = opt.target
    if (!target || fabricHistoryRuntime.isSuppressed()) return
    if (!shouldRecordFabricHistory(target)) return
    const fabricObjectId =
      getFabricHistoryId(target) ?? assignFabricHistoryId(target)
    const snap =
      lastSerialized.get(target) ?? serializeFabricObjectForHistory(target)
    lastSerialized.delete(target)
    beforeTransformSnap.delete(target)
    pushEntry({
      type: inferHistoryTypeFromData(target)!,
      label: inferHistoryLabel(target),
      pageNumber: getCurrentPage(),
      fabricObjectId,
      snapshot: snap,
      action: 'delete',
    })
  }

  canvas.on('before:path:created', onBeforePath)
  canvas.on('before:transform', onBeforeTransform)
  canvas.on('object:added', onObjectAdded)
  canvas.on('object:modified', onObjectModified)
  canvas.on('object:removed', onObjectRemoved)

  return {
    dispose: () => {
      canvas.off('before:path:created', onBeforePath)
      canvas.off('before:transform', onBeforeTransform)
      canvas.off('object:added', onObjectAdded)
      canvas.off('object:modified', onObjectModified)
      canvas.off('object:removed', onObjectRemoved)
    },
    manualRecordAdd,
  }
}
