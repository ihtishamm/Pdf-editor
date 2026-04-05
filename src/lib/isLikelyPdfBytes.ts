/** True if bytes look like a PDF (pdf-lib rejects empty or non-PDF buffers). */
export function isLikelyPdfBytes(
  buf: Uint8Array | null | undefined,
): boolean {
  if (!buf || buf.byteLength < 8) return false
  return (
    buf[0] === 0x25 &&
    buf[1] === 0x50 &&
    buf[2] === 0x44 &&
    buf[3] === 0x46 &&
    buf[4] === 0x2d
  )
}
