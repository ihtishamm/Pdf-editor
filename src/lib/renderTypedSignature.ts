/**
 * Renders typed name to PNG data URL (transparent background) for Fabric `Image.fromURL`.
 * Caller should ensure the font is loaded (`document.fonts.load`).
 */
export function renderTypedSignatureDataUrl(
  text: string,
  fontFamily: string,
  color: string,
  canvasWidth = 560,
  canvasHeight = 140,
): string {
  const canvas = document.createElement('canvas')
  canvas.width = canvasWidth
  canvas.height = canvasHeight
  const ctx = canvas.getContext('2d')
  if (!ctx) return ''

  ctx.clearRect(0, 0, canvasWidth, canvasHeight)

  const trimmed = text.trim()
  if (!trimmed) {
    return canvas.toDataURL('image/png')
  }

  const padX = 16
  const maxTextW = canvasWidth - padX * 2
  let fontSize = 64
  const minSize = 20

  const measure = () => {
    ctx.font = `${fontSize}px "${fontFamily}", cursive`
    return ctx.measureText(trimmed).width
  }

  let w = measure()
  while (w > maxTextW && fontSize > minSize) {
    fontSize -= 2
    w = measure()
  }

  ctx.fillStyle = color
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(trimmed, canvasWidth / 2, canvasHeight / 2)

  return canvas.toDataURL('image/png')
}
