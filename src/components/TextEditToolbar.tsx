import { Canvas, IText } from 'fabric'
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

const FONT_CHOICES = [
  'Inter',
  'Helvetica',
  'Arial',
  'Times New Roman',
  'Georgia',
  'Courier New',
  'Verdana',
  'sans-serif',
  'serif',
  'monospace',
] as const

type TextEditToolbarProps = {
  canvas: Canvas | null
  target: IText | null
}

function colorToHex(input: string | undefined): string {
  if (!input || input === 'transparent') return '#111827'
  if (input.startsWith('#') && (input.length === 4 || input.length === 7)) {
    return input
  }
  const m = input.match(/rgba?\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i)
  if (m) {
    const r = Number(m[1]).toString(16).padStart(2, '0')
    const g = Number(m[2]).toString(16).padStart(2, '0')
    const b = Number(m[3]).toString(16).padStart(2, '0')
    return `#${r}${g}${b}`
  }
  return '#111827'
}

/**
 * Floating formatting bar for the selected Fabric IText (Fabric v7 events / object API).
 * Position is applied imperatively to avoid setState-in-effect; `fabricTick` forces re-read of object props after Fabric changes.
 */
export function TextEditToolbar({ canvas, target }: TextEditToolbarProps) {
  const toolbarRef = useRef<HTMLDivElement>(null)
  const [fabricTick, setFabricTick] = useState(0)

  const bump = useCallback(() => {
    setFabricTick((t) => t + 1)
  }, [])

  useLayoutEffect(() => {
    if (!canvas || !target || !toolbarRef.current) return
    const el = toolbarRef.current
    const place = () => {
      const bound = target.getBoundingRect()
      const br = canvas.upperCanvasEl.getBoundingClientRect()
      el.style.left = `${br.left + bound.left}px`
      el.style.top = `${Math.max(8, br.top + bound.top - 44)}px`
    }
    place()
  }, [canvas, target, fabricTick])

  useEffect(() => {
    if (!canvas || !target) return
    const onCanvas = () => bump()
    canvas.on('after:render', onCanvas)
    canvas.on('object:modified', onCanvas)
    target.on('changed', onCanvas)
    target.on('editing:entered', onCanvas)
    target.on('editing:exited', onCanvas)
    return () => {
      canvas.off('after:render', onCanvas)
      canvas.off('object:modified', onCanvas)
      target.off('changed', onCanvas)
      target.off('editing:entered', onCanvas)
      target.off('editing:exited', onCanvas)
    }
  }, [canvas, target, bump])

  const apply = useCallback(
    (patch: Partial<{ fontFamily: string; fontSize: number; fontWeight: string; fontStyle: string; fill: string }>) => {
      if (!canvas || !target) return
      target.set(patch)
      target.setCoords()
      canvas.requestRenderAll()
      canvas.fire('object:modified', { target })
      bump()
    },
    [canvas, target, bump],
  )

  if (!target || !canvas) {
    return null
  }

  const fontFamily = (target.fontFamily as string) || 'sans-serif'
  const fontSize = target.fontSize ?? 16
  const bold = target.fontWeight === 'bold' || target.fontWeight === '700'
  const italic = target.fontStyle === 'italic'
  const color = colorToHex(target.fill as string)

  return createPortal(
    <div
      ref={toolbarRef}
      className="fixed z-[100] flex max-w-[min(100vw-16px,480px)] flex-wrap items-center gap-2 rounded-lg border border-ring bg-surface-alt px-3 py-2 text-sm shadow-elevated"
      role="toolbar"
      aria-label="Text formatting"
    >
      <label className="flex items-center gap-1">
        <span className="sr-only">Font</span>
        <select
          className="max-w-[180px] rounded border border-ring bg-surface-3 px-1 py-1 text-text"
          value={fontFamily}
          onChange={(e) => {
            apply({ fontFamily: e.target.value })
          }}
        >
          {!FONT_CHOICES.includes(fontFamily as (typeof FONT_CHOICES)[number]) ? (
            <option value={fontFamily}>{fontFamily}</option>
          ) : null}
          {FONT_CHOICES.map((f) => (
            <option key={f} value={f}>
              {f}
            </option>
          ))}
        </select>
      </label>
      <label className="flex items-center gap-1">
        <span className="text-muted">Size</span>
        <input
          type="number"
          min={4}
          max={400}
          className="w-16 rounded border border-ring bg-surface-3 px-1 py-1 text-text"
          value={Math.round(fontSize)}
          onChange={(e) => {
            const n = Number(e.target.value)
            if (!Number.isFinite(n)) return
            apply({ fontSize: n })
          }}
        />
      </label>
      <button
        type="button"
        className={`rounded border px-2 py-1 font-bold ${bold ? 'border-primary/50 bg-primary/10 text-primary' : 'border-ring bg-surface-3 text-muted'}`}
        aria-pressed={bold}
        onClick={() => {
          apply({ fontWeight: bold ? 'normal' : 'bold' })
        }}
      >
        B
      </button>
      <button
        type="button"
        className={`rounded border px-2 py-1 italic ${italic ? 'border-primary/50 bg-primary/10 text-primary' : 'border-ring bg-surface-3 text-muted'}`}
        aria-pressed={italic}
        onClick={() => {
          apply({ fontStyle: italic ? 'normal' : 'italic' })
        }}
      >
        I
      </button>
      <label className="flex items-center gap-1">
        <span className="sr-only">Color</span>
        <input
          type="color"
          className="h-8 w-10 cursor-pointer rounded border border-ring bg-surface-3 p-0"
          value={color}
          onChange={(e) => {
            apply({ fill: e.target.value })
          }}
        />
      </label>
    </div>,
    document.body,
  )
}
