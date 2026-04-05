import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react'
import {
  drawStrokesOnContext,
  type SignatureStroke,
  strokesToPngDataUrl,
} from '../lib/signatureStrokeDrawing'

export type SignatureDrawPadHandle = {
  clear: () => void
  toPngDataUrl: () => string | null
  hasInk: boolean
}

type SignatureDrawPadProps = {
  color: string
  className?: string
  /** Fires when the user has drawn (or cleared) ink; drives parent Save enabled state. */
  onInkChange?: (hasInk: boolean) => void
}

const CANVAS_W = 640
const CANVAS_H = 220
const LINE_W = 2.5

function pointFromEvent(
  canvas: HTMLCanvasElement,
  clientX: number,
  clientY: number,
): { x: number; y: number } {
  const r = canvas.getBoundingClientRect()
  const sx = CANVAS_W / r.width
  const sy = CANVAS_H / r.height
  return {
    x: (clientX - r.left) * sx,
    y: (clientY - r.top) * sy,
  }
}

export const SignatureDrawPad = forwardRef<
  SignatureDrawPadHandle,
  SignatureDrawPadProps
>(function SignatureDrawPad({ color, className, onInkChange }, ref) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const strokesRef = useRef<SignatureStroke[]>([])
  const currentRef = useRef<SignatureStroke | null>(null)
  const [hasInk, setHasInk] = useState(false)

  const redraw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const list = [...strokesRef.current]
    if (currentRef.current) list.push(currentRef.current)
    drawStrokesOnContext(ctx, list, CANVAS_W, CANVAS_H, 'white')
  }, [])

  useEffect(() => {
    redraw()
  }, [redraw])

  const clear = useCallback(() => {
    strokesRef.current = []
    currentRef.current = null
    setHasInk(false)
    onInkChange?.(false)
    redraw()
  }, [onInkChange, redraw])

  useImperativeHandle(
    ref,
    () => ({
      clear,
      toPngDataUrl: () => {
        if (!strokesRef.current.length) return null
        return strokesToPngDataUrl(strokesRef.current, CANVAS_W, CANVAS_H, 'white')
      },
      hasInk,
    }),
    [clear, hasInk],
  )

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    const p = pointFromEvent(e.currentTarget, e.clientX, e.clientY)
    currentRef.current = {
      color,
      lineWidth: LINE_W,
      points: [p],
    }
    redraw()
  }

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!currentRef.current) return
    const p = pointFromEvent(e.currentTarget, e.clientX, e.clientY)
    currentRef.current.points.push(p)
    redraw()
  }

  const endStroke = () => {
    const cur = currentRef.current
    if (cur && cur.points.length >= 2) {
      strokesRef.current.push(cur)
      setHasInk(true)
      onInkChange?.(true)
    }
    currentRef.current = null
    redraw()
  }

  return (
    <canvas
      ref={canvasRef}
      width={CANVAS_W}
      height={CANVAS_H}
      className={className}
      style={{ width: '100%', height: 'auto', touchAction: 'none' }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endStroke}
      onPointerCancel={endStroke}
      onPointerLeave={() => {
        if (currentRef.current) endStroke()
      }}
    />
  )
})
