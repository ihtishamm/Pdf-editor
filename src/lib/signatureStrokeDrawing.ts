/**
 * Smooth freehand strokes using midpoints and {@link https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/quadraticCurveTo | quadraticCurveTo}
 * (control point = sample, end = midpoint to next sample).
 */
export type StrokePoint = { x: number; y: number }

export type SignatureStroke = {
  color: string
  lineWidth: number
  points: StrokePoint[]
}

export function drawStrokesOnContext(
  ctx: CanvasRenderingContext2D,
  strokes: SignatureStroke[],
  width: number,
  height: number,
  background: 'white' | 'transparent',
): void {
  if (background === 'white') {
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, width, height)
  } else {
    ctx.clearRect(0, 0, width, height)
  }

  for (const stroke of strokes) {
    const pts = stroke.points
    if (pts.length < 2) continue
    ctx.strokeStyle = stroke.color
    ctx.lineWidth = stroke.lineWidth
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.beginPath()
    ctx.moveTo(pts[0]!.x, pts[0]!.y)
    for (let i = 1; i < pts.length - 1; i++) {
      const p0 = pts[i]!
      const p1 = pts[i + 1]!
      const mx = (p0.x + p1.x) / 2
      const my = (p0.y + p1.y) / 2
      ctx.quadraticCurveTo(p0.x, p0.y, mx, my)
    }
    const last = pts[pts.length - 1]!
    ctx.lineTo(last.x, last.y)
    ctx.stroke()
  }
}

export function strokesToPngDataUrl(
  strokes: SignatureStroke[],
  width: number,
  height: number,
  background: 'white' | 'transparent',
): string {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) return ''
  drawStrokesOnContext(ctx, strokes, width, height, background)
  return canvas.toDataURL('image/png')
}
