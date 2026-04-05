/**
 * AcroForm field kinds placed on the canvas (visual + export metadata).
 * Positions are normalized 0–1 relative to the page overlay so zoom and
 * canvas resize stay aligned with PDF.js / pdf-lib page dimensions.
 */
export type FormFieldType = 'text' | 'checkbox' | 'radio' | 'dropdown' | 'button'

export type FormFieldMeta = {
  id: string
  page: number
  type: FormFieldType
  /** Exported PDF field name (unique per widget where required by pdf-lib). */
  name: string
  /** Top-left X as fraction of overlay width (canvas coordinates, origin top-left). */
  position: { x: number; y: number }
  /** Width / height as fractions of overlay width and height. */
  size: { w: number; h: number }
  /** Dropdown options; also used as default button text hints where relevant. */
  options: string[]
  required: boolean
  placeholder: string
  /** Radio widgets sharing this name are one AcroForm radio group. */
  radioGroupName: string
  /** Option id for pdf-lib `addOptionToPage`. */
  radioOptionId: string
  /** Push button caption on the PDF. */
  buttonLabel: string
  /** Widget outline on the Fabric preview (hex, e.g. #dc2626). */
  borderColor: string
  /** Placeholder / caption text color on the canvas preview. */
  textColor: string
  /** Placeholder / label font size on the canvas (px). */
  fontSize: number
}
