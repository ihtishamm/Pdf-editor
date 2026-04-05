import {
  Canvas,
  FabricImage,
  version as fabricVersion,
  type FabricObject,
} from 'fabric'

if (import.meta.env.DEV) {
  console.info('[fabric] insertFabricImage using fabric', fabricVersion)
}

const MIME_OK = /^image\/(png|jpeg|jpe?g|svg\+xml)$/i

function isImageFile(file: File): boolean {
  if (MIME_OK.test(file.type)) return true
  const n = file.name.toLowerCase()
  return n.endsWith('.png') || n.endsWith('.jpg') || n.endsWith('.jpeg') || n.endsWith('.svg')
}

export function isPlacedFabricImage(o: FabricObject | undefined | null): o is FabricImage {
  if (!o || !(o instanceof FabricImage)) return false
  const d = (o as FabricObject & { data?: { tool?: string } }).data
  return d?.tool === 'placedImage'
}

/**
 * Loads an image via object URL and adds it to the Fabric canvas (Fabric v7: `FabricImage.fromURL`).
 * Coordinates are Fabric scene space (top-left), matching the PDF viewport overlay.
 */
export async function addFabricImageFromFile(
  canvas: Canvas,
  file: File,
): Promise<void> {
  if (!isImageFile(file)) return

  const url = URL.createObjectURL(file)
  try {
    const img = await FabricImage.fromURL(url, { crossOrigin: 'anonymous' })

    const cw = canvas.getWidth()
    const ch = canvas.getHeight()
    const maxW = cw * 0.85
    const maxH = ch * 0.85
    const iw = img.width || 1
    const ih = img.height || 1
    const scale = Math.min(maxW / iw, maxH / ih, 1)

    img.set({
      scaleX: scale,
      scaleY: scale,
      left: cw / 2,
      top: ch / 2,
      originX: 'center',
      originY: 'center',
      selectable: true,
      evented: true,
      hasControls: true,
      hasBorders: true,
      objectCaching: true,
      opacity: 1,
    })
    Object.assign(img, {
      data: { tool: 'placedImage' as const, fileName: file.name },
    })
    img.setCoords()

    canvas.add(img)
    canvas.bringObjectToFront(img)
    canvas.setActiveObject(img)
    canvas.requestRenderAll()
  } finally {
    URL.revokeObjectURL(url)
  }
}

export function pickImageFilesFromDataTransfer(dt: DataTransfer): File[] {
  const out: File[] = []
  if (!dt.files?.length) return out
  for (let i = 0; i < dt.files.length; i++) {
    const f = dt.files.item(i)
    if (f && isImageFile(f)) out.push(f)
  }
  return out
}
