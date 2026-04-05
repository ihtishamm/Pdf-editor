/** Single active primary tool (Zustand `activeTool`). */
export type EditorTool =
  | 'select'
  | 'text'
  | 'whiteout'
  | 'shapes'
  | 'annotate'
  | 'draw'
  | 'forms'

/** Active subtype when `activeTool === 'forms'` (Forms toolbar). */
export type FormFieldVariant =
  | 'text'
  | 'checkbox'
  | 'radio'
  | 'dropdown'
  | 'button'

export type ShapeVariant = 'rectangle' | 'circle' | 'line' | 'arrow'

export type AnnotateVariant =
  | 'highlight'
  | 'underline'
  | 'strike'
  | 'comment'

export type CommentEntry = {
  id: string
  page: number
  sceneX: number
  sceneY: number
  body: string
}
