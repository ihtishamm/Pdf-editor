import { Canvas, type FabricObject } from 'fabric'
import { Trash2 } from 'lucide-react'
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { getFormFieldId, isFormFieldObject } from '../lib/fabricFormField'
import { usePdfEditorStore } from '../store/pdfEditorStore'
import type { EditorTool } from '../types/editorTools'

const FONT_SIZES = [10, 11, 12, 13, 14, 16, 18, 20, 24] as const

type FormFieldFloatingToolbarProps = {
  canvas: Canvas | null
  activeTool: EditorTool
}

export function FormFieldFloatingToolbar({
  canvas,
  activeTool,
}: FormFieldFloatingToolbarProps) {
  const toolbarRef = useRef<HTMLDivElement>(null)
  const [target, setTarget] = useState<FabricObject | null>(null)
  const [tick, setTick] = useState(0)

  const formFields = usePdfEditorStore((s) => s.formFields)
  const updateFormField = usePdfEditorStore((s) => s.updateFormField)
  const removeFormField = usePdfEditorStore((s) => s.removeFormField)
  const setSelectedFormFieldId = usePdfEditorStore((s) => s.setSelectedFormFieldId)

  const bump = useCallback(() => {
    setTick((t) => t + 1)
  }, [])

  useEffect(() => {
    if (!canvas || activeTool !== 'select') return
    const sync = () => {
      const o = canvas.getActiveObject()
      setTarget(o && isFormFieldObject(o) ? o : null)
    }
    const onCleared = () => setTarget(null)
    sync()
    canvas.on('selection:created', sync)
    canvas.on('selection:updated', sync)
    canvas.on('selection:cleared', onCleared)
    canvas.on('object:modified', sync)
    return () => {
      canvas.off('selection:created', sync)
      canvas.off('selection:updated', sync)
      canvas.off('selection:cleared', onCleared)
      canvas.off('object:modified', sync)
    }
  }, [canvas, activeTool])

  useLayoutEffect(() => {
    if (!canvas || !target || !toolbarRef.current) return
    const el = toolbarRef.current
    const bound = target.getBoundingRect()
    const br = canvas.upperCanvasEl.getBoundingClientRect()
    el.style.left = `${br.left + bound.left}px`
    el.style.top = `${Math.max(8, br.top + bound.top - 48)}px`
  }, [canvas, target, tick])

  useEffect(() => {
    if (!canvas || !target) return
    const onAfter = () => bump()
    canvas.on('after:render', onAfter)
    return () => {
      canvas.off('after:render', onAfter)
    }
  }, [canvas, target, bump])

  const fieldId = target ? getFormFieldId(target) : null
  const meta = fieldId
    ? formFields.find((f) => f.id === fieldId)
    : undefined

  const onPatch = useCallback(
    (patch: Parameters<typeof updateFormField>[1]) => {
      if (!fieldId) return
      updateFormField(fieldId, patch)
      bump()
    },
    [fieldId, updateFormField, bump],
  )

  const onDelete = useCallback(() => {
    if (!canvas || !fieldId) return
    removeFormField(fieldId)
    setSelectedFormFieldId(null)
    canvas.discardActiveObject()
    canvas.requestRenderAll()
    setTarget(null)
  }, [canvas, fieldId, removeFormField, setSelectedFormFieldId])

  if (!target || !canvas || activeTool !== 'select' || !meta) {
    return null
  }

  return createPortal(
    <div
      ref={toolbarRef}
      className="fixed z-[200] flex max-w-[min(100vw-16px,520px)] flex-wrap items-center gap-2 rounded-lg border border-[#b3d7ff] bg-white px-2.5 py-2 text-sm shadow-lg"
      role="toolbar"
      aria-label="Form field"
    >
      <label className="flex items-center gap-1">
        <span className="whitespace-nowrap text-xs text-slate-500">Name</span>
        <input
          type="text"
          value={meta.name}
          onChange={(e) => onPatch({ name: e.target.value })}
          className="w-[120px] rounded border border-slate-300 px-1.5 py-1 text-xs text-slate-800"
        />
      </label>

      <label className="flex items-center gap-1">
        <span className="text-xs text-slate-500">Border</span>
        <input
          type="color"
          className="h-8 w-9 cursor-pointer rounded border border-slate-300 bg-white p-0"
          value={meta.borderColor}
          onChange={(e) => onPatch({ borderColor: e.target.value })}
        />
      </label>

      <label className="flex items-center gap-1">
        <span className="text-xs text-slate-500">Text</span>
        <input
          type="color"
          className="h-8 w-9 cursor-pointer rounded border border-slate-300 bg-white p-0"
          value={meta.textColor}
          onChange={(e) => onPatch({ textColor: e.target.value })}
        />
      </label>

      <label className="flex items-center gap-1">
        <span className="text-xs text-slate-500">Size</span>
        <select
          value={meta.fontSize}
          onChange={(e) => onPatch({ fontSize: Number(e.target.value) })}
          className="rounded border border-slate-300 bg-white px-1 py-1 text-xs text-slate-800"
        >
          {!FONT_SIZES.includes(meta.fontSize as (typeof FONT_SIZES)[number]) ? (
            <option value={meta.fontSize}>{meta.fontSize}px</option>
          ) : null}
          {FONT_SIZES.map((n) => (
            <option key={n} value={n}>
              {n}px
            </option>
          ))}
        </select>
      </label>

      <button
        type="button"
        onClick={onDelete}
        className="ml-0.5 flex h-8 w-8 items-center justify-center rounded border border-red-200 text-red-600 hover:bg-red-50"
        aria-label="Delete form field"
        title="Delete field"
      >
        <Trash2 className="h-4 w-4" strokeWidth={2} />
      </button>
    </div>,
    document.body,
  )
}
