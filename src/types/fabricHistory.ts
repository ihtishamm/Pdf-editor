export type HistoryAction = 'add' | 'modify' | 'delete'

export type HistoryFabricType =
  | 'text'
  | 'signature'
  | 'image'
  | 'shape'
  | 'link'
  | 'form'
  | 'whiteout'
  | 'annotation'

export type HistoryEntry = {
  id: string
  type: HistoryFabricType
  label: string
  timestamp: Date
  pageNumber: number
  /** Stable id stored on `target.data.fabricHistoryId`. */
  fabricObjectId: string
  snapshot: string
  action: HistoryAction
}
