import { X } from 'lucide-react'
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from 'react'
import { createPortal } from 'react-dom'
import { renderTypedSignatureDataUrl } from '../lib/renderTypedSignature'
import { usePdfEditorStore } from '../store/pdfEditorStore'
import {
  SignatureDrawPad,
  type SignatureDrawPadHandle,
} from './SignatureDrawPad'

const SIGNATURE_PRESET_COLORS = [
  '#1e3a8a',
  '#1e40af',
  '#2563eb',
  '#3b82f6',
  '#60a5fa',
  '#6b7280',
  '#000000',
] as const

/** Curated Google Fonts (handwriting / script) for typed signatures. */
const SIGNATURE_FONT_STYLES: { id: string; family: string }[] = [
  { id: 'dancing', family: 'Dancing Script' },
  { id: 'pacifico', family: 'Pacifico' },
  { id: 'great', family: 'Great Vibes' },
  { id: 'satisfy', family: 'Satisfy' },
  { id: 'caveat', family: 'Caveat' },
  { id: 'allura', family: 'Allura' },
  { id: 'sacramento', family: 'Sacramento' },
  { id: 'alex', family: 'Alex Brush' },
  { id: 'pinyon', family: 'Pinyon Script' },
  { id: 'parisienne', family: 'Parisienne' },
  { id: 'kaushan', family: 'Kaushan Script' },
]

const GOOGLE_FONTS_URL =
  'https://fonts.googleapis.com/css2?family=Alex+Brush&family=Allura&family=Caveat:wght@400;700&family=Dancing+Script:wght@400;700&family=Great+Vibes&family=Kaushan+Script&family=Pacifico&family=Parisienne&family=Pinyon+Script&family=Sacramento&family=Satisfy&display=swap'

type TabId = 'type' | 'draw' | 'upload' | 'saved'

type CreateSignatureModalProps = {
  open: boolean
  onClose: () => void
}

function loadSignatureFontStylesheet(): void {
  const id = 'pdf-editor-signature-fonts'
  if (document.getElementById(id)) return
  const link = document.createElement('link')
  link.id = id
  link.rel = 'stylesheet'
  link.href = GOOGLE_FONTS_URL
  document.head.appendChild(link)
}

async function waitForSignatureFonts(): Promise<void> {
  loadSignatureFontStylesheet()
  await document.fonts.ready
  await Promise.all(
    SIGNATURE_FONT_STYLES.map((f) =>
      document.fonts.load(`400 36px "${f.family}"`),
    ),
  )
}

function ColorPickerRow({
  value,
  onChange,
  labelledBy,
}: {
  value: string
  onChange: (c: string) => void
  labelledBy: string
}) {
  return (
    <div className="flex flex-wrap items-center gap-3" role="group" aria-labelledby={labelledBy}>
      {SIGNATURE_PRESET_COLORS.map((c) => {
        const selected = value === c
        return (
          <button
            key={c}
            type="button"
            aria-label={`Color ${c}`}
            aria-pressed={selected}
            className={`h-9 w-9 shrink-0 rounded-full border-2 border-white shadow-sm ring-offset-2 ring-offset-white transition-shadow ${
              selected ? 'ring-2 ring-[#40a9ff]' : 'ring-0'
            }`}
            style={{ backgroundColor: c }}
            onClick={() => onChange(c)}
          />
        )
      })}
    </div>
  )
}

export function CreateSignatureModal({ open, onClose }: CreateSignatureModalProps) {
  const titleId = useId()
  const typeColorLabel = useId()
  const drawColorLabel = useId()

  const addSavedSignature = usePdfEditorStore((s) => s.addSavedSignature)
  const enqueueSignatureDataUrl = usePdfEditorStore((s) => s.enqueueSignatureDataUrl)
  const savedSignatures = usePdfEditorStore((s) => s.savedSignatures)
  const removeSavedSignature = usePdfEditorStore((s) => s.removeSavedSignature)
  const setActiveTool = usePdfEditorStore((s) => s.setActiveTool)

  const [tab, setTab] = useState<TabId>('type')
  const [typeName, setTypeName] = useState('')
  const [typeColor, setTypeColor] = useState<string>(SIGNATURE_PRESET_COLORS[2]!)
  const [selectedFontId, setSelectedFontId] = useState(SIGNATURE_FONT_STYLES[0]!.id)
  const [fontsReady, setFontsReady] = useState(false)
  const [drawColor, setDrawColor] = useState<string>(SIGNATURE_PRESET_COLORS[2]!)
  const drawPadRef = useRef<SignatureDrawPadHandle>(null)
  const [drawHasInk, setDrawHasInk] = useState(false)

  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploadPreviewUrl, setUploadPreviewUrl] = useState<string | null>(null)
  const uploadInputRef = useRef<HTMLInputElement>(null)

  const previewText = typeName.trim() || 'Your name'
  const selectedFont =
    SIGNATURE_FONT_STYLES.find((f) => f.id === selectedFontId) ??
    SIGNATURE_FONT_STYLES[0]!

  const commitAndClose = useCallback(
    (
      dataUrl: string,
      addToLibrary: boolean,
      placeAtCursor = false,
    ) => {
      if (addToLibrary) addSavedSignature(dataUrl)
      enqueueSignatureDataUrl(dataUrl, placeAtCursor)
      setActiveTool('select')
      onClose()
    },
    [addSavedSignature, enqueueSignatureDataUrl, onClose, setActiveTool],
  )

  useEffect(() => {
    if (!open) return
    void waitForSignatureFonts().then(() => setFontsReady(true))
  }, [open])

  useEffect(() => {
    if (!open) return
    const id = requestAnimationFrame(() => {
      setTab('type')
      setTypeName('')
      setUploadFile(null)
      setUploadPreviewUrl(null)
      drawPadRef.current?.clear()
      setDrawHasInk(false)
    })
    return () => cancelAnimationFrame(id)
  }, [open])

  useEffect(() => {
    if (!uploadFile) {
      const id = requestAnimationFrame(() => setUploadPreviewUrl(null))
      return () => cancelAnimationFrame(id)
    }
    const url = URL.createObjectURL(uploadFile)
    const sid = requestAnimationFrame(() => setUploadPreviewUrl(url))
    return () => {
      cancelAnimationFrame(sid)
      URL.revokeObjectURL(url)
    }
  }, [uploadFile])

  const handleTypeSave = async () => {
    if (!typeName.trim() || !fontsReady) return
    await waitForSignatureFonts()
    await document.fonts.load(`64px "${selectedFont.family}"`)
    const dataUrl = renderTypedSignatureDataUrl(
      typeName.trim(),
      selectedFont.family,
      typeColor,
    )
    commitAndClose(dataUrl, true)
  }

  const handleDrawSave = () => {
    const url = drawPadRef.current?.toPngDataUrl()
    if (!url) return
    commitAndClose(url, true)
  }

  const handleUploadSave = () => {
    if (!uploadFile || !uploadPreviewUrl) return
    const reader = new FileReader()
    reader.onload = () => {
      const r = reader.result
      if (typeof r === 'string') commitAndClose(r, true)
    }
    reader.readAsDataURL(uploadFile)
  }

  const handleSavedUse = (dataUrl: string) => {
    commitAndClose(dataUrl, false, true)
  }

  if (!open) return null

  return createPortal(
    <div className="fixed inset-0 z-[130] flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        aria-label="Close dialog"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal
        aria-labelledby={titleId}
        className="relative z-[131] flex max-h-[min(90vh,720px)] w-full max-w-lg flex-col rounded-lg border border-[#b3d7ff] bg-white shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-[#e8e8e8] px-4 py-3">
          <h2 id={titleId} className="text-base font-semibold text-[#333]">
            Create signature
          </h2>
          <button
            type="button"
            className="rounded p-1 text-[#666] hover:bg-slate-100"
            aria-label="Close"
            onClick={onClose}
          >
            <X className="h-5 w-5" strokeWidth={1.75} />
          </button>
        </div>

        <div className="flex shrink-0 gap-0 border-b border-[#e8e8e8] px-2 pt-2">
          {(
            [
              ['type', 'Type'],
              ['draw', 'Draw'],
              ['upload', 'Upload'],
              ['saved', 'Saved'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={tab === id}
              className={`min-h-10 flex-1 rounded-t-md px-2 text-sm font-medium ${
                tab === id
                  ? 'border border-b-0 border-[#b3d7ff] bg-white text-[#333]'
                  : 'border border-transparent text-[#666] hover:bg-slate-50'
              }`}
              onClick={() => setTab(id)}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {tab === 'type' ? (
            <div className="space-y-4">
              <label className="block">
                <span className="text-xs font-medium text-[#666]">Your name</span>
                <input
                  type="text"
                  className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm text-[#333]"
                  placeholder="Type your name"
                  value={typeName}
                  onChange={(e) => setTypeName(e.target.value)}
                  autoComplete="name"
                />
              </label>
              <div>
                <p id={typeColorLabel} className="text-xs font-medium text-[#666]">
                  Color
                </p>
                <div className="mt-2">
                  <ColorPickerRow
                    value={typeColor}
                    onChange={setTypeColor}
                    labelledBy={typeColorLabel}
                  />
                </div>
              </div>
              <div>
                <p className="text-xs font-medium text-[#666]">Style</p>
                <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {SIGNATURE_FONT_STYLES.map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setSelectedFontId(f.id)}
                      className={`flex min-h-[52px] items-center justify-center rounded border px-2 py-2 text-center text-lg leading-tight transition-colors ${
                        selectedFontId === f.id
                          ? 'border-[#40a9ff] bg-[#f0f8ff]'
                          : 'border-slate-200 bg-white hover:bg-slate-50'
                      }`}
                      style={{ fontFamily: `"${f.family}", cursive` }}
                    >
                      {previewText}
                    </button>
                  ))}
                </div>
              </div>
              <button
                type="button"
                disabled={!typeName.trim() || !fontsReady}
                onClick={() => void handleTypeSave()}
                className="w-full rounded bg-[#00a67e] py-2.5 text-sm font-medium text-white hover:bg-[#00916d] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Save
              </button>
            </div>
          ) : null}

          {tab === 'draw' ? (
            <div className="space-y-4">
              <div>
                <p id={drawColorLabel} className="text-xs font-medium text-[#666]">
                  Color
                </p>
                <div className="mt-2">
                  <ColorPickerRow
                    value={drawColor}
                    onChange={setDrawColor}
                    labelledBy={drawColorLabel}
                  />
                </div>
              </div>
              <div className="overflow-hidden rounded border border-slate-200 bg-white">
                <SignatureDrawPad
                  ref={drawPadRef}
                  color={drawColor}
                  onInkChange={setDrawHasInk}
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => drawPadRef.current?.clear()}
                  className="rounded border border-slate-300 bg-white px-4 py-2 text-sm text-[#333] hover:bg-slate-50"
                >
                  Clear
                </button>
                <button
                  type="button"
                  disabled={!drawHasInk}
                  onClick={handleDrawSave}
                  className="ml-auto min-w-[120px] rounded bg-[#00a67e] px-4 py-2 text-sm font-medium text-white hover:bg-[#00916d] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Save
                </button>
              </div>
            </div>
          ) : null}

          {tab === 'upload' ? (
            <div className="space-y-4">
              <input
                ref={uploadInputRef}
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/svg+xml,.png,.jpg,.jpeg,.svg"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0] ?? null
                  setUploadFile(f)
                  e.target.value = ''
                }}
              />
              <button
                type="button"
                onClick={() => uploadInputRef.current?.click()}
                className="w-full rounded border border-dashed border-slate-300 py-8 text-sm text-[#666] hover:border-[#40a9ff] hover:bg-[#f8fbff]"
              >
                Choose PNG, JPG, or SVG
              </button>
              {uploadPreviewUrl ? (
                <div className="flex justify-center rounded border border-slate-200 bg-slate-50 p-4">
                  <img
                    src={uploadPreviewUrl}
                    alt="Upload preview"
                    className="max-h-40 max-w-full object-contain"
                  />
                </div>
              ) : null}
              <button
                type="button"
                disabled={!uploadFile}
                onClick={handleUploadSave}
                className="w-full rounded bg-[#00a67e] py-2.5 text-sm font-medium text-white hover:bg-[#00916d] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Save
              </button>
            </div>
          ) : null}

          {tab === 'saved' ? (
            <div className="space-y-3">
              {savedSignatures.length === 0 ? (
                <p className="text-sm text-[#888]">No saved signatures yet.</p>
              ) : (
                <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {savedSignatures.map((s) => (
                    <li
                      key={s.id}
                      className="group relative rounded border border-slate-200 bg-slate-50 p-2"
                    >
                      <button
                        type="button"
                        onClick={() => handleSavedUse(s.dataUrl)}
                        className="flex w-full flex-col items-center gap-2"
                      >
                        <img
                          src={s.dataUrl}
                          alt=""
                          className="max-h-20 max-w-full object-contain"
                        />
                        <span className="text-xs text-[#40a9ff]">Insert</span>
                      </button>
                      <button
                        type="button"
                        aria-label="Remove from saved"
                        className="absolute right-1 top-1 rounded bg-white/90 px-1.5 py-0.5 text-xs text-red-600 opacity-0 shadow group-hover:opacity-100"
                        onClick={() => removeSavedSignature(s.id)}
                      >
                        ×
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>,
    document.body,
  )
}
