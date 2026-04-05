/** Stored per link region; `id` is the stable key (also on Fabric `data.linkId`). */
export type PdfLinkType = 'url' | 'email' | 'phone' | 'page'

export type PdfLinkEntry = {
  id: string
  page: number
  /** Normalized 0–1 vs Fabric canvas width/height for that page render. */
  position: { x: number; y: number }
  size: { w: number; h: number }
  linkType: PdfLinkType
  value: string
}
