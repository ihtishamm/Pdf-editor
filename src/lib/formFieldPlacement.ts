import type { FormFieldVariant } from '../types/editorTools'

/** Typical web control sizes in overlay pixels (before normalization). */
export function defaultFormFieldPixelSize(
  variant: FormFieldVariant,
): { width: number; height: number } {
  switch (variant) {
    case 'checkbox':
    case 'radio':
      return { width: 20, height: 20 }
    case 'button':
      return { width: 128, height: 38 }
    case 'text':
    case 'dropdown':
      return { width: 220, height: 38 }
    default:
      return { width: 220, height: 38 }
  }
}
