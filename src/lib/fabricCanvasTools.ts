import {
  Circle,
  Ellipse,
  FabricText,
  Group,
  IText,
  Line,
  Path,
  PencilBrush,
  Rect,
  type Canvas,
  type FabricObject,
  type TPointerEventInfo,
} from 'fabric'
import {
  FORM_GHOST_TOOL,
  formFieldObjectToNormalized,
  getFormFieldId,
  isFormFieldObject,
  isFormGhostObject,
} from './fabricFormField'
import {
  defaultLabelForAnnotate,
  defaultLabelForShapeData,
  markFabricHistoryUser,
} from './fabricHistoryHelpers'
import {
  fabricLinkToNormalized,
  getPdfLinkId,
  isPdfLinkObject,
} from './fabricPdfLink'
import { defaultFormFieldPixelSize } from './formFieldPlacement'
import type {
  AnnotateVariant,
  EditorTool,
  FormFieldVariant,
  ShapeVariant,
} from '../types/editorTools'

type Getters = {
  getActiveTool: () => EditorTool
  getShapeVariant: () => ShapeVariant
  getAnnotateVariant: () => AnnotateVariant
  getFormFieldVariant: () => FormFieldVariant
  getCurrentPage: () => number
}

type BoxDrag = {
  kind: 'box'
  mode: 'whiteout' | 'shape' | 'annotate'
  shapeVariant?: ShapeVariant
  annotateVariant?: AnnotateVariant
  sx: number
  sy: number
  temp: Rect
}

type LineDrag = {
  kind: 'line'
  shapeVariant: 'line' | 'arrow'
  sx: number
  sy: number
  ex: number
  ey: number
  temp: Line
}

type LinkBoxDrag = {
  kind: 'linkBox'
  sx: number
  sy: number
  temp: Rect
}

type DragState = BoxDrag | LineDrag | LinkBoxDrag

function updateBoxFromDrag(
  temp: Rect,
  sx: number,
  sy: number,
  x: number,
  y: number,
) {
  const left = Math.min(sx, x)
  const top = Math.min(sy, y)
  const w = Math.max(2, Math.abs(x - sx))
  const h = Math.max(2, Math.abs(y - sy))
  temp.set({ left, top, width: w, height: h })
  temp.setCoords()
}

/** Default styling for new whiteout rects (editable in select mode via the properties bar). */
export const WHITEOUT_DEFAULTS = {
  fill: '#ffffff',
  stroke: '#d1d5db',
  strokeWidth: 1,
  opacity: 1,
} as const

function finalizeOverlayObject(
  canvas: Canvas,
  obj: FabricObject,
  manualHistory?: (o: FabricObject) => void,
) {
  obj.set({
    selectable: true,
    evented: true,
    hasControls: true,
    hasBorders: true,
  })
  obj.setCoords()
  canvas.bringObjectToFront(obj)

  if (manualHistory) {
    const d = (obj as FabricObject & { data?: { tool?: string } }).data
    if (d?.tool === 'whiteout') {
      markFabricHistoryUser(obj, 'whiteout', 'Whiteout')
      manualHistory(obj)
    } else if (d?.tool === 'shape') {
      markFabricHistoryUser(obj, 'shape', defaultLabelForShapeData(obj))
      manualHistory(obj)
    } else if (d?.tool === 'annotate') {
      markFabricHistoryUser(obj, 'annotation', defaultLabelForAnnotate(obj))
      manualHistory(obj)
    }
  }
}

function clampScene(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n))
}

export function removeFormPlacementGhost(canvas: Canvas): void {
  for (const o of [...canvas.getObjects()]) {
    if (isFormGhostObject(o)) {
      canvas.remove(o)
    }
  }
}

function syncFormPlacementGhost(
  canvas: Canvas,
  variant: FormFieldVariant,
  pointerX: number,
  pointerY: number,
  fw: number,
  fh: number,
  cw: number,
  ch: number,
): void {
  const left = clampScene(pointerX, 0, Math.max(0, cw - fw))
  const top = clampScene(pointerY, 0, Math.max(0, ch - fh))
  const rx = variant === 'radio' ? Math.min(fw, fh) / 2 : 3
  const existing = canvas.getObjects().find(isFormGhostObject) as Group | undefined
  if (!existing) {
    const rect = new Rect({
      left: 0,
      top: 0,
      width: fw,
      height: fh,
      fill: 'rgba(37, 99, 235, 0.2)',
      stroke: '#2563eb',
      strokeWidth: 1,
      strokeDashArray: [6, 4],
      rx,
      ry: rx,
      objectCaching: false,
      selectable: false,
      evented: false,
    })
    const g = new Group([rect], {
      left,
      top,
      selectable: false,
      evented: false,
      objectCaching: false,
      opacity: 0.92,
    })
    Object.assign(g, { data: { tool: FORM_GHOST_TOOL } })
    canvas.add(g)
    canvas.bringObjectToFront(g)
    return
  }
  existing.set({ left, top })
  const inner = existing.item(0) as Rect
  inner.set({ width: fw, height: fh, rx, ry: rx })
  existing.setCoords()
  inner.setCoords()
  canvas.bringObjectToFront(existing)
}

function arrowPathD(sx: number, sy: number, ex: number, ey: number): string {
  const angle = Math.atan2(ey - sy, ex - sx)
  const headLen = 14
  const spread = 0.42
  const hx1 = ex - headLen * Math.cos(angle - spread)
  const hy1 = ey - headLen * Math.sin(angle - spread)
  const hx2 = ex - headLen * Math.cos(angle + spread)
  const hy2 = ey - headLen * Math.sin(angle + spread)
  return `M ${sx} ${sy} L ${ex} ${ey} M ${hx1} ${hy1} L ${ex} ${ey} L ${hx2} ${hy2} Z`
}

/**
 * Attaches whiteout, shapes, annotate (incl. comment pins), text placement, and IText selection sync.
 * Caller must call `applyCanvasToolMode` when `activeTool` / `annotateVariant` change.
 */
export function attachFabricCanvasTools(
  canvas: Canvas,
  getters: Getters,
  callbacks: {
    addCommentAt: (page: number, sceneX: number, sceneY: number) => string
    onSelectionIText: (t: IText | null) => void
    onSelectionFormField: (fieldId: string | null) => void
    onFormFieldBox: (args: {
      page: number
      left: number
      top: number
      width: number
      height: number
      canvasW: number
      canvasH: number
      variant: FormFieldVariant
    }) => void
    onFormFieldGeometryCommit: (
      fieldId: string,
      position: { x: number; y: number },
      size: { w: number; h: number },
    ) => void
    onLinkBoxDrawn: (args: {
      page: number
      left: number
      top: number
      width: number
      height: number
      canvasW: number
      canvasH: number
    }) => void
    onLinkClicked: (linkId: string) => void
    onPdfLinkGeometryCommit: (
      linkId: string,
      position: { x: number; y: number },
      size: { w: number; h: number },
    ) => void
    onManualHistoryAdd?: (obj: FabricObject) => void
  },
): () => void {
  let drag: DragState | null = null

  const onSelectionCreated = () => syncSelection()
  const onSelectionUpdated = () => syncSelection()
  const onSelectionCleared = () => {
    callbacks.onSelectionIText(null)
    callbacks.onSelectionFormField(null)
  }

  function syncSelection() {
    const obj = canvas.getActiveObject()
    callbacks.onSelectionIText(obj instanceof IText ? obj : null)
    const d = (obj as FabricObject & { data?: { tool?: string; fieldId?: string } })
      ?.data
    callbacks.onSelectionFormField(
      d?.tool === 'formField' && d.fieldId ? d.fieldId : null,
    )
  }

  const onMouseDown = (opt: TPointerEventInfo) => {
    const tool = getters.getActiveTool()
    const { x, y } = opt.scenePoint

    if (tool === 'draw') return

    if (tool === 'links') {
      const linkId = opt.target ? getPdfLinkId(opt.target) : null
      if (linkId) {
        callbacks.onLinkClicked(linkId)
        return
      }
      if (opt.target) return
      const temp = new Rect({
        left: x,
        top: y,
        width: 2,
        height: 2,
        fill: 'rgba(64, 169, 255, 0.2)',
        stroke: '#2563eb',
        strokeWidth: 1.5,
        strokeDashArray: [6, 4],
        objectCaching: false,
        selectable: false,
        evented: false,
      })
      Object.assign(temp, { data: { dragPreview: true } })
      canvas.add(temp)
      drag = { kind: 'linkBox', sx: x, sy: y, temp }
      return
    }

    if (tool === 'text') {
      if (opt.target) return
      const t = new IText('Type here', {
        left: x,
        top: y,
        fontSize: 16,
        fill: '#111827',
        fontFamily: 'sans-serif',
        editable: true,
        objectCaching: false,
      })
      markFabricHistoryUser(t, 'text', 'Type your text')
      canvas.add(t)
      canvas.setActiveObject(t)
      canvas.requestRenderAll()
      callbacks.onSelectionIText(t)
      return
    }

    if (tool === 'annotate' && getters.getAnnotateVariant() === 'comment') {
      if (opt.target) return
      const page = getters.getCurrentPage()
      const id = callbacks.addCommentAt(page, x, y)
      const pin = new Circle({
        radius: 14,
        fill: '#fbbf24',
        stroke: '#b45309',
        strokeWidth: 1,
        originX: 'center',
        originY: 'center',
        left: 0,
        top: 0,
        objectCaching: false,
      })
      const label = new FabricText('💬', {
        fontSize: 14,
        originX: 'center',
        originY: 'center',
        left: 0,
        top: 0,
        objectCaching: false,
      })
      const g = new Group([pin, label], {
        left: x,
        top: y,
        originX: 'center',
        originY: 'center',
        objectCaching: false,
      })
      Object.assign(g, {
        data: { tool: 'commentPin', commentId: id },
      })
      markFabricHistoryUser(g, 'annotation', 'Comment')
      canvas.add(g)
      finalizeOverlayObject(canvas, g)
      canvas.setActiveObject(g)
      canvas.requestRenderAll()
      return
    }

    if (tool === 'select') return

    if (
      opt.target &&
      tool !== 'annotate' &&
      !isFormGhostObject(opt.target)
    ) {
      return
    }

    if (tool === 'forms') {
      const variant = getters.getFormFieldVariant()
      const { width: fw, height: fh } = defaultFormFieldPixelSize(variant)
      const cw = canvas.getWidth()
      const ch = canvas.getHeight()
      const left = clampScene(x, 0, Math.max(0, cw - fw))
      const top = clampScene(y, 0, Math.max(0, ch - fh))
      callbacks.onFormFieldBox({
        page: getters.getCurrentPage(),
        left,
        top,
        width: fw,
        height: fh,
        canvasW: cw,
        canvasH: ch,
        variant,
      })
      removeFormPlacementGhost(canvas)
      canvas.requestRenderAll()
      return
    }

    if (tool === 'whiteout') {
      const temp = new Rect({
        left: x,
        top: y,
        width: 2,
        height: 2,
        fill: WHITEOUT_DEFAULTS.fill,
        stroke: WHITEOUT_DEFAULTS.stroke,
        strokeWidth: WHITEOUT_DEFAULTS.strokeWidth,
        opacity: WHITEOUT_DEFAULTS.opacity,
        objectCaching: false,
        selectable: false,
        evented: true,
      })
      Object.assign(temp, { data: { tool: 'whiteout', dragPreview: true } })
      canvas.add(temp)
      drag = { kind: 'box', mode: 'whiteout', sx: x, sy: y, temp }
      return
    }

    if (tool === 'shapes') {
      const sv = getters.getShapeVariant()
      if (sv === 'line' || sv === 'arrow') {
        const temp = new Line([x, y, x, y], {
          stroke: '#1f2937',
          strokeWidth: 2,
          objectCaching: false,
          selectable: false,
        })
        Object.assign(temp, {
          data: { tool: 'shape', variant: sv, dragPreview: true },
        })
        canvas.add(temp)
        drag = {
          kind: 'line',
          shapeVariant: sv,
          sx: x,
          sy: y,
          ex: x,
          ey: y,
          temp,
        }
        return
      }
      const temp = new Rect({
        left: x,
        top: y,
        width: 2,
        height: 2,
        fill: 'transparent',
        stroke: '#1f2937',
        strokeWidth: 2,
        objectCaching: false,
        selectable: false,
      })
      Object.assign(temp, {
        data: { tool: 'shape', variant: sv, dragPreview: true },
      })
      canvas.add(temp)
      drag = {
        kind: 'box',
        mode: 'shape',
        shapeVariant: sv,
        sx: x,
        sy: y,
        temp,
      }
      return
    }

    if (tool === 'annotate') {
      const av = getters.getAnnotateVariant()
      if (av === 'highlight') {
        const temp = new Rect({
          left: x,
          top: y,
          width: 2,
          height: 2,
          fill: 'rgba(255, 255, 0, 0.35)',
          stroke: 'transparent',
          objectCaching: false,
          selectable: false,
        })
        Object.assign(temp, {
          data: { tool: 'annotate', variant: 'highlight', dragPreview: true },
        })
        canvas.add(temp)
        drag = { kind: 'box', mode: 'annotate', annotateVariant: av, sx: x, sy: y, temp }
        return
      }
      const temp = new Rect({
        left: x,
        top: y,
        width: 2,
        height: 2,
        fill: 'transparent',
        stroke: 'transparent',
        objectCaching: false,
        selectable: false,
      })
      Object.assign(temp, {
        data: { tool: 'annotate', variant: av, dragPreview: true },
      })
      canvas.add(temp)
      drag = {
        kind: 'box',
        mode: 'annotate',
        annotateVariant: av,
        sx: x,
        sy: y,
        temp,
      }
    }
  }

  const onMouseMove = (opt: TPointerEventInfo) => {
    const tool = getters.getActiveTool()
    if (tool === 'forms') {
      const variant = getters.getFormFieldVariant()
      const { width: fw, height: fh } = defaultFormFieldPixelSize(variant)
      const { x, y } = opt.scenePoint
      const cw = canvas.getWidth()
      const ch = canvas.getHeight()
      syncFormPlacementGhost(canvas, variant, x, y, fw, fh, cw, ch)
      canvas.requestRenderAll()
    }
    if (!drag) return
    const { x, y } = opt.scenePoint
    if (drag.kind === 'linkBox') {
      updateBoxFromDrag(drag.temp, drag.sx, drag.sy, x, y)
      canvas.requestRenderAll()
      return
    }
    if (drag.kind === 'box') {
      updateBoxFromDrag(drag.temp, drag.sx, drag.sy, x, y)
      canvas.requestRenderAll()
      return
    }
    drag.ex = x
    drag.ey = y
    drag.temp.set({ x1: drag.sx, y1: drag.sy, x2: x, y2: y })
    drag.temp.setCoords()
    canvas.requestRenderAll()
  }

  const onMouseUp = () => {
    if (!drag) return
    const d = drag
    drag = null

    if (d.kind === 'linkBox') {
      const temp = d.temp
      const left = temp.left ?? 0
      const top = temp.top ?? 0
      const w = temp.width ?? 0
      const h = temp.height ?? 0
      canvas.remove(temp)
      const cw = canvas.getWidth()
      const ch = canvas.getHeight()
      if (w < 4 || h < 4) {
        canvas.requestRenderAll()
        return
      }
      callbacks.onLinkBoxDrawn({
        page: getters.getCurrentPage(),
        left,
        top,
        width: w,
        height: h,
        canvasW: cw,
        canvasH: ch,
      })
      canvas.requestRenderAll()
      return
    }

    if (d.kind === 'line') {
      const { sx, sy, ex, ey, shapeVariant, temp } = d
      canvas.remove(temp)

      if (shapeVariant === 'line') {
        const line = new Line([sx, sy, ex, ey], {
          stroke: '#1f2937',
          strokeWidth: 2,
          objectCaching: false,
          padding: 10,
        })
        Object.assign(line, { data: { tool: 'shape', variant: 'line' } })
        markFabricHistoryUser(line, 'shape', 'Line')
        canvas.add(line)
        finalizeOverlayObject(canvas, line)
        canvas.setActiveObject(line)
        canvas.requestRenderAll()
        return
      }

      const path = new Path(arrowPathD(sx, sy, ex, ey), {
        fill: '#1f2937',
        stroke: '#1f2937',
        strokeWidth: 2,
        strokeLineJoin: 'round',
        objectCaching: false,
        padding: 10,
      })
      Object.assign(path, { data: { tool: 'shape', variant: 'arrow' } })
      markFabricHistoryUser(path, 'shape', 'Arrow')
      canvas.add(path)
      finalizeOverlayObject(canvas, path)
      canvas.setActiveObject(path)
      canvas.requestRenderAll()
      return
    }

    const temp = d.temp
    const left = temp.left ?? 0
    const top = temp.top ?? 0
    const w = temp.width ?? 0
    const h = temp.height ?? 0
    const right = left + w
    const bottom = top + h

    if (d.mode === 'shape' && d.shapeVariant === 'circle') {
      canvas.remove(temp)
      const cx = left + w / 2
      const cy = top + h / 2
      const ellipse = new Ellipse({
        left: cx,
        top: cy,
        originX: 'center',
        originY: 'center',
        rx: Math.max(4, w / 2),
        ry: Math.max(4, h / 2),
        fill: 'transparent',
        stroke: '#1f2937',
        strokeWidth: 2,
        objectCaching: false,
      })
      Object.assign(ellipse, { data: { tool: 'shape', variant: 'circle' } })
      markFabricHistoryUser(ellipse, 'shape', 'Ellipse')
      canvas.add(ellipse)
      finalizeOverlayObject(canvas, ellipse)
      canvas.setActiveObject(ellipse)
      canvas.requestRenderAll()
      return
    }

    if (d.mode === 'annotate' && d.annotateVariant === 'underline') {
      canvas.remove(temp)
      const line = new Line([left, bottom - 1, right, bottom - 1], {
        stroke: '#2563eb',
        strokeWidth: 2,
        objectCaching: false,
        padding: 10,
      })
      Object.assign(line, { data: { tool: 'annotate', variant: 'underline' } })
      markFabricHistoryUser(line, 'annotation', 'Underline')
      canvas.add(line)
      finalizeOverlayObject(canvas, line)
      canvas.setActiveObject(line)
      canvas.requestRenderAll()
      return
    }

    if (d.mode === 'annotate' && d.annotateVariant === 'strike') {
      canvas.remove(temp)
      const midY = top + h / 2
      const line = new Line([left, midY, right, midY], {
        stroke: '#dc2626',
        strokeWidth: 2,
        objectCaching: false,
        padding: 10,
      })
      Object.assign(line, { data: { tool: 'annotate', variant: 'strike' } })
      markFabricHistoryUser(line, 'annotation', 'Strikethrough')
      canvas.add(line)
      finalizeOverlayObject(canvas, line)
      canvas.setActiveObject(line)
      canvas.requestRenderAll()
      return
    }

    finalizeOverlayObject(canvas, temp, callbacks.onManualHistoryAdd)
    canvas.setActiveObject(temp)
    canvas.requestRenderAll()
  }

  const onObjectModified = (opt: { target?: FabricObject }) => {
    const t = opt.target
    if (!t) return
    if (isFormFieldObject(t)) {
      const id = getFormFieldId(t)
      if (!id) return
      const cw = canvas.getWidth()
      const ch = canvas.getHeight()
      const { position, size } = formFieldObjectToNormalized(t, cw, ch)
      callbacks.onFormFieldGeometryCommit(id, position, size)
      return
    }
    if (isPdfLinkObject(t)) {
      const id = getPdfLinkId(t)
      if (!id) return
      const cw = canvas.getWidth()
      const ch = canvas.getHeight()
      const { position, size } = fabricLinkToNormalized(t, cw, ch)
      callbacks.onPdfLinkGeometryCommit(id, position, size)
    }
  }

  canvas.on('selection:created', onSelectionCreated)
  canvas.on('selection:updated', onSelectionUpdated)
  canvas.on('selection:cleared', onSelectionCleared)
  canvas.on('mouse:down', onMouseDown)
  canvas.on('mouse:move', onMouseMove)
  canvas.on('mouse:up', onMouseUp)
  canvas.on('object:modified', onObjectModified)

  return () => {
    drag = null
    removeFormPlacementGhost(canvas)
    canvas.off('selection:created', onSelectionCreated)
    canvas.off('selection:updated', onSelectionUpdated)
    canvas.off('selection:cleared', onSelectionCleared)
    canvas.off('mouse:down', onMouseDown)
    canvas.off('mouse:move', onMouseMove)
    canvas.off('mouse:up', onMouseUp)
    canvas.off('object:modified', onObjectModified)
  }
}

export function applyCanvasToolMode(
  canvas: Canvas,
  tool: EditorTool,
  annotateVariant: AnnotateVariant,
): void {
  const isDraw = tool === 'draw'
  canvas.isDrawingMode = isDraw
  if (isDraw) {
    canvas.freeDrawingBrush = new PencilBrush(canvas)
    canvas.freeDrawingBrush.width = 3
    canvas.freeDrawingBrush.color = '#111827'
  }
  /** Marquee / multi-select only in select (and text for IText workflow). */
  canvas.selection = tool === 'select' || tool === 'text'
  const isCommentMode = tool === 'annotate' && annotateVariant === 'comment'
  /**
   * Keep target finding on for whiteout / shapes / annotate so existing overlays stay clickable
   * while those tools are active. `selection` stays off for those tools so an empty click does not
   * start a marquee (Fabric still activates objects via setActiveObject when a target is hit).
   * Skip finding for draw, comment placement, and forms placement (ghost + click-to-add).
   */
  canvas.skipTargetFind = tool === 'draw' || isCommentMode || tool === 'forms'
  if (tool !== 'forms') {
    removeFormPlacementGhost(canvas)
  }
  if (tool === 'text' || tool === 'draw' || tool === 'forms' || tool === 'links') {
    canvas.defaultCursor = 'crosshair'
  } else if (isCommentMode) {
    canvas.defaultCursor = 'copy'
  } else {
    canvas.defaultCursor = 'default'
  }
}

export function isShapeToolObject(o: FabricObject | undefined): boolean {
  if (!o) return false
  const d = (o as FabricObject & { data?: { tool?: string } }).data
  return d?.tool === 'shape'
}

export function isAnnotateToolObject(o: FabricObject | undefined): boolean {
  if (!o) return false
  const d = (o as FabricObject & { data?: { tool?: string } }).data
  return d?.tool === 'annotate'
}

export function isWhiteoutObject(o: FabricObject | undefined): boolean {
  if (!o) return false
  const d = (o as FabricObject & { data?: { tool?: string } }).data
  return d?.tool === 'whiteout'
}

export function isOverlayPropertiesObject(o: FabricObject | undefined): boolean {
  return (
    isShapeToolObject(o) ||
    isAnnotateToolObject(o) ||
    isWhiteoutObject(o)
  )
}
