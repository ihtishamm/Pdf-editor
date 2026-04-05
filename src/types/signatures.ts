export type SavedSignature = {
  id: string
  dataUrl: string
  createdAt: number
}

/** Queued insert from the Sign modal; cursor placement uses last Fabric `mouse:move` scene point. */
export type PendingSignatureInsert = {
  dataUrl: string
  placeAtCursor: boolean
}
