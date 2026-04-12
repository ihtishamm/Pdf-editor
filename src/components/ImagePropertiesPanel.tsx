import { Canvas, FabricImage } from 'fabric'
import { useCallback, useEffect, useState } from 'react'
import { ArrowDown, ArrowUp, FlipHorizontal2, FlipVertical2 } from 'lucide-react'
import { isPlacedFabricImage } from '../lib/insertFabricImage'
import { usePdfEditorStore } from '../store/pdfEditorStore'
import type { EditorTool } from '../types/editorTools'

type ImagePropertiesPanelProps = {
  canvas: Canvas | null
  activeTool: EditorTool
}

export function ImagePropertiesPanel({
  canvas,
  activeTool,
}: ImagePropertiesPanelProps) {
  const commentPanelOpen = usePdfEditorStore((s) => s.commentPanelOpen)
  const [target, setTarget] = useState<FabricImage | null>(null)
  const [tick, setTick] = useState(0)

  const bump = useCallback(() => setTick((t) => t + 1), [])

  useEffect(() => {
    if (!canvas || activeTool !== 'select') return
    const sync = () => {
      const o = canvas.getActiveObject()
      setTarget(o && isPlacedFabricImage(o) ? o : null)
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

  const apply = useCallback(
    (fn: (img: FabricImage) => void) => {
      if (!canvas || !target) return
      fn(target)
      target.setCoords()
      canvas.requestRenderAll()
      bump()
    },
    [canvas, target, bump],
  )

  if (!canvas || !target || activeTool !== 'select') {
    return null
  }

  const opacity = typeof target.opacity === 'number' ? target.opacity : 1
  const flipX = !!target.flipX
  const flipY = !!target.flipY

  return (
    <aside
      data-rerender={tick}
      className={`fixed top-24 z-[95] w-[min(100vw-16px,280px)] rounded-lg border border-ring bg-surface-alt p-4 shadow-elevated ${
        commentPanelOpen ? 'right-[min(360px,92vw)] max-md:right-2' : 'right-2'
      }`}
      aria-label="Image properties"
    >
      <h3 className="mb-3 text-sm font-semibold text-text">Image</h3>
      <label className="mb-4 block text-xs text-muted">
        Opacity
        <input
          type="range"
          min={0}
          max={100}
          className="mt-1 block w-full"
          value={Math.round(opacity * 100)}
          onChange={(e) => {
            const v = Number(e.target.value) / 100
            apply((img) => img.set({ opacity: Math.min(1, Math.max(0, v)) }))
          }}
        />
      </label>
      <div className="mb-4 flex flex-wrap gap-2">
        <button
          type="button"
          className={`rounded border px-2 py-1.5 text-xs ${
            flipX ? 'border-primary/50 bg-primary/10 text-primary' : 'border-ring bg-surface-3 text-muted'
          }`}
          aria-pressed={flipX}
          onClick={() => {
            apply((img) => img.set({ flipX: !img.flipX }))
          }}
        >
          <FlipHorizontal2 className="mr-1 inline h-3.5 w-3.5 align-text-bottom" />
          Flip H
        </button>
        <button
          type="button"
          className={`rounded border px-2 py-1.5 text-xs ${
            flipY ? 'border-primary/50 bg-primary/10 text-primary' : 'border-ring bg-surface-3 text-muted'
          }`}
          aria-pressed={flipY}
          onClick={() => {
            apply((img) => img.set({ flipY: !img.flipY }))
          }}
        >
          <FlipVertical2 className="mr-1 inline h-3.5 w-3.5 align-text-bottom" />
          Flip V
        </button>
      </div>
      <div className="flex flex-col gap-2">
        <button
          type="button"
          className="flex items-center justify-center gap-1 rounded border border-ring bg-surface-3 px-2 py-2 text-xs text-muted hover:bg-surface-3/80"
          onClick={() => {
            if (!canvas || !target) return
            canvas.bringObjectForward(target)
            canvas.requestRenderAll()
            bump()
          }}
        >
          <ArrowUp className="h-3.5 w-3.5" />
          Bring forward
        </button>
        <button
          type="button"
          className="flex items-center justify-center gap-1 rounded border border-ring bg-surface-3 px-2 py-2 text-xs text-muted hover:bg-surface-3/80"
          onClick={() => {
            if (!canvas || !target) return
            canvas.sendObjectBackwards(target)
            canvas.requestRenderAll()
            bump()
          }}
        >
          <ArrowDown className="h-3.5 w-3.5" />
          Send backward
        </button>
      </div>
      <p className="mt-3 text-[10px] leading-snug text-placeholder">
        Hold Shift while resizing a corner to lock aspect ratio (Fabric {''}
        default).
      </p>
    </aside>
  )
}
