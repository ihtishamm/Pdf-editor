import {
  ChevronDown,
  ChevronRight,
  Eraser,
  Grid3x3,
  HelpCircle,
  Highlighter,
  Image,
  Link2,
  ListChecks,
  MousePointer2,
  Pen,
  Pencil,
  RotateCcw,
  RotateCw,
  Shapes,
  Trash2,
  Type,
  Undo2,
  ZoomIn,
  ZoomOut,
} from 'lucide-react'
import type { ReactNode } from 'react'
import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { isLikelyPdfBytes } from '../lib/isLikelyPdfBytes'
import { usePdfEditorStore } from '../store/pdfEditorStore'
import { Button } from './ui/Button'
import { CreateSignatureModal } from './CreateSignatureModal'
import { UndoHistoryDialog } from './UndoHistoryDialog'
import type {
  AnnotateVariant,
  FormFieldVariant,
  ShapeVariant,
} from '../types/editorTools'

const SHAPE_OPTIONS: { id: ShapeVariant; label: string }[] = [
  { id: 'rectangle', label: 'Rectangle' },
  { id: 'circle', label: 'Circle' },
  { id: 'line', label: 'Line' },
  { id: 'arrow', label: 'Arrow' },
]

const ANNOTATE_OPTIONS: { id: AnnotateVariant; label: string }[] = [
  { id: 'highlight', label: 'Highlight' },
  { id: 'underline', label: 'Underline' },
  { id: 'strike', label: 'Strikethrough' },
  { id: 'comment', label: 'Comment' },
]

const FORM_OPTIONS: { id: FormFieldVariant; label: string }[] = [
  { id: 'text', label: 'Text Field' },
  { id: 'checkbox', label: 'Checkbox' },
  { id: 'radio', label: 'Radio Button' },
  { id: 'dropdown', label: 'Dropdown' },
  { id: 'button', label: 'Button' },
]

type EditorShellProps = {
  children: ReactNode
  thumbnailsOpen: boolean
  onToggleThumbnails: () => void
}

/* Shared tool-button styles */
const toolBase =
  'flex items-center gap-1.5 rounded-btn px-2.5 py-2 text-sm font-medium text-muted transition-colors hover:bg-primary/6 hover:text-near-black'
const toolActive = 'bg-primary/8 text-primary'

function ToolBtn({
  active,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }) {
  return (
    <button
      type="button"
      className={`${toolBase} ${active ? toolActive : ''}`}
      {...props}
    >
      {children}
    </button>
  )
}

/* Dropdown menu wrapper */
function DropdownMenu({
  open,
  children,
}: {
  open: boolean
  children: ReactNode
}) {
  if (!open) return null
  return (
    <div
      className="absolute left-0 top-full z-[100] mt-1.5 min-w-[170px] rounded-card border border-ring bg-surface py-1 shadow-elevated"
      role="menu"
    >
      {children}
    </div>
  )
}

function DropdownItem({
  selected,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { selected?: boolean }) {
  return (
    <button
      type="button"
      role="menuitem"
      className={`block w-full px-3.5 py-2 text-left text-sm font-medium transition-colors hover:bg-primary/6 ${
        selected ? 'bg-primary/8 text-primary' : 'text-near-black'
      }`}
      {...props}
    >
      {children}
    </button>
  )
}

export function EditorShell({
  children,
  thumbnailsOpen,
  onToggleThumbnails,
}: EditorShellProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)

  const pdfFileName = usePdfEditorStore((s) => s.pdfFileName)
  const currentPage = usePdfEditorStore((s) => s.currentPage)
  const totalPages = usePdfEditorStore((s) => s.totalPages)
  const zoomLevel = usePdfEditorStore((s) => s.zoomLevel)
  const loadFile = usePdfEditorStore((s) => s.loadFile)
  const zoomIn = usePdfEditorStore((s) => s.zoomIn)
  const zoomOut = usePdfEditorStore((s) => s.zoomOut)
  const activeTool = usePdfEditorStore((s) => s.activeTool)
  const setActiveTool = usePdfEditorStore((s) => s.setActiveTool)
  const shapeVariant = usePdfEditorStore((s) => s.shapeVariant)
  const setShapeVariant = usePdfEditorStore((s) => s.setShapeVariant)
  const annotateVariant = usePdfEditorStore((s) => s.annotateVariant)
  const setAnnotateVariant = usePdfEditorStore((s) => s.setAnnotateVariant)
  const setCommentPanelOpen = usePdfEditorStore((s) => s.setCommentPanelOpen)
  const enqueueImageInsert = usePdfEditorStore((s) => s.enqueueImageInsert)
  const pdfSourceBytes = usePdfEditorStore((s) => s.pdfSourceBytes)
  const formFields = usePdfEditorStore((s) => s.formFields)
  const pdfLinks = usePdfEditorStore((s) => s.pdfLinks)
  const formFieldVariant = usePdfEditorStore((s) => s.formFieldVariant)
  const setFormFieldVariant = usePdfEditorStore((s) => s.setFormFieldVariant)
  const history = usePdfEditorStore((s) => s.history)
  const undoLast = usePdfEditorStore((s) => s.undoLast)
  const fabricByPage = usePdfEditorStore((s) => s.fabricByPage)
  const pageOverlaySnapshots = usePdfEditorStore((s) => s.pageOverlaySnapshots)
  const pdfNativeTextByPage = usePdfEditorStore((s) => s.pdfNativeTextByPage)
  const setExportResult = usePdfEditorStore((s) => s.setExportResult)
  const setCurrentView = usePdfEditorStore((s) => s.setCurrentView)
  const setIsExporting = usePdfEditorStore((s) => s.setIsExporting)
  const showToast = usePdfEditorStore((s) => s.showToast)

  const [shapesOpen, setShapesOpen] = useState(false)
  const [annotateOpen, setAnnotateOpen] = useState(false)
  const [formsOpen, setFormsOpen] = useState(false)
  const [signModalOpen, setSignModalOpen] = useState(false)
  const [undoHistoryOpen, setUndoHistoryOpen] = useState(false)

  const hasHistory = history.length > 0

  const closeAllDropdowns = () => {
    setShapesOpen(false)
    setAnnotateOpen(false)
    setFormsOpen(false)
  }

  const handleExport = () => {
    if (!pdfSourceBytes || totalPages < 1) return
    if (!isLikelyPdfBytes(pdfSourceBytes)) {
      showToast('The PDF file data is missing or invalid. Try opening the file again.')
      return
    }
    void (async () => {
      setIsExporting(true)
      try {
        const { runFullPdfExport } = await import('../lib/pdfExportPipeline')
        const out = await runFullPdfExport({
          originalFileBytes: pdfSourceBytes,
          fabricByPage,
          pageCount: totalPages,
          formFields,
          pdfLinks,
          baseFileName: pdfFileName || 'document.pdf',
          pageOverlaySnapshots,
          pdfNativeTextByPage,
        })
        const url = URL.createObjectURL(out.blob)
        setExportResult(url, out.bytes, out.filename)
        setCurrentView('ready')
      } catch (e) {
        console.error('[EditorShell] export failed', e)
        showToast('Something went wrong. Please try again.')
      } finally {
        setIsExporting(false)
      }
    })()
  }

  return (
    <div className="relative flex min-h-dvh flex-col bg-surface-alt text-near-black">
      <UndoHistoryDialog
        open={undoHistoryOpen}
        onClose={() => setUndoHistoryOpen(false)}
      />

      {/* ─── Header ─── */}
      <header className="sticky top-0 z-50 border-b border-ring bg-surface">
        <div className="flex items-center justify-between gap-4 px-4 py-2.5">
          {/* Brand */}
          <Link to="/" className="flex shrink-0 items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-btn bg-primary font-display text-sm font-bold text-white">
              P
            </span>
            <span className="hidden font-display text-base font-semibold tracking-tight sm:block">
              PDF Studio
            </span>
          </Link>

          {/* File name */}
          <div className="flex min-w-0 flex-1 items-center justify-center">
            <span
              className="truncate rounded-btn px-3 py-1 text-sm font-medium text-muted"
              title={pdfFileName}
            >
              {pdfFileName || 'Untitled'}
            </span>
          </div>

          {/* Actions */}
          <div className="flex shrink-0 items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) void loadFile(f)
                e.target.value = ''
              }}
            />
            <Button
              variant="secondary"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
            >
              Upload PDF
            </Button>
            <Button
              variant="primary"
              size="sm"
              disabled={!pdfSourceBytes || !isLikelyPdfBytes(pdfSourceBytes) || totalPages < 1}
              onClick={handleExport}
            >
              Apply changes
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* ─── Toolbar ─── */}
      <div className="sticky z-40 border-b border-ring bg-surface px-3 py-2">
        <div className="mx-auto flex max-w-[1100px] flex-wrap items-center justify-center gap-0.5">
          {/* Selection & Drawing Tools */}
          <div className="flex items-center rounded-btn border border-ring bg-surface p-0.5 shadow-ring">
            <ToolBtn
              active={activeTool === 'select'}
              onClick={() => { closeAllDropdowns(); setActiveTool('select') }}
              aria-pressed={activeTool === 'select'}
            >
              <MousePointer2 className="h-4 w-4" strokeWidth={1.75} />
              <span className="hidden sm:inline">Select</span>
            </ToolBtn>
            <ToolBtn
              active={activeTool === 'text'}
              onClick={() => { closeAllDropdowns(); setActiveTool('text') }}
              aria-pressed={activeTool === 'text'}
            >
              <Type className="h-4 w-4" strokeWidth={1.75} />
              <span className="hidden sm:inline">Text</span>
            </ToolBtn>
            <ToolBtn
              active={activeTool === 'draw'}
              onClick={() => { closeAllDropdowns(); setActiveTool('draw') }}
              aria-pressed={activeTool === 'draw'}
            >
              <Pencil className="h-4 w-4" strokeWidth={1.75} />
              <span className="hidden sm:inline">Draw</span>
            </ToolBtn>
            <ToolBtn
              active={activeTool === 'whiteout'}
              onClick={() => { closeAllDropdowns(); setActiveTool('whiteout') }}
              aria-pressed={activeTool === 'whiteout'}
            >
              <Eraser className="h-4 w-4" strokeWidth={1.75} />
              <span className="hidden sm:inline">Whiteout</span>
            </ToolBtn>

            {/* Shapes dropdown */}
            <div className="relative">
              <ToolBtn
                active={activeTool === 'shapes'}
                onClick={() => {
                  setShapesOpen((o) => !o)
                  setAnnotateOpen(false)
                  setFormsOpen(false)
                }}
                aria-expanded={shapesOpen}
              >
                <Shapes className="h-4 w-4" strokeWidth={1.75} />
                <span className="hidden sm:inline">Shapes</span>
                <ChevronDown className="h-3 w-3 text-placeholder" />
              </ToolBtn>
              <DropdownMenu open={shapesOpen}>
                {SHAPE_OPTIONS.map(({ id, label }) => (
                  <DropdownItem
                    key={id}
                    selected={shapeVariant === id && activeTool === 'shapes'}
                    onClick={() => {
                      setShapeVariant(id)
                      setActiveTool('shapes')
                      setShapesOpen(false)
                    }}
                  >
                    {label}
                  </DropdownItem>
                ))}
              </DropdownMenu>
            </div>

            {/* Annotate dropdown */}
            <div className="relative">
              <ToolBtn
                active={activeTool === 'annotate'}
                onClick={() => {
                  setAnnotateOpen((o) => !o)
                  setShapesOpen(false)
                  setFormsOpen(false)
                }}
                aria-expanded={annotateOpen}
              >
                <Highlighter className="h-4 w-4" strokeWidth={1.75} />
                <span className="hidden sm:inline">Annotate</span>
                <ChevronDown className="h-3 w-3 text-placeholder" />
              </ToolBtn>
              <DropdownMenu open={annotateOpen}>
                {ANNOTATE_OPTIONS.map(({ id, label }) => (
                  <DropdownItem
                    key={id}
                    selected={annotateVariant === id && activeTool === 'annotate'}
                    onClick={() => {
                      setAnnotateVariant(id)
                      setActiveTool('annotate')
                      setAnnotateOpen(false)
                      if (id === 'comment') setCommentPanelOpen(true)
                    }}
                  >
                    {label}
                  </DropdownItem>
                ))}
              </DropdownMenu>
            </div>
          </div>

          {/* Spacer */}
          <div className="mx-1 hidden h-6 w-px bg-ring sm:block" />

          {/* Insert & Structure Tools */}
          <div className="flex items-center rounded-btn border border-ring bg-surface p-0.5 shadow-ring">
            <input
              ref={imageInputRef}
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/svg+xml,.png,.jpg,.jpeg,.svg"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) {
                  enqueueImageInsert(f)
                  setActiveTool('select')
                }
                e.target.value = ''
              }}
            />
            <ToolBtn onClick={() => imageInputRef.current?.click()}>
              <Image className="h-4 w-4" strokeWidth={1.75} />
              <span className="hidden sm:inline">Image</span>
            </ToolBtn>
            <ToolBtn
              disabled={!pdfSourceBytes}
              onClick={() => {
                closeAllDropdowns()
                setSignModalOpen(true)
              }}
            >
              <Pen className="h-4 w-4" strokeWidth={1.75} />
              <span className="hidden sm:inline">Sign</span>
            </ToolBtn>
            <ToolBtn
              active={activeTool === 'links'}
              onClick={() => { closeAllDropdowns(); setActiveTool('links') }}
              aria-pressed={activeTool === 'links'}
            >
              <Link2 className="h-4 w-4" strokeWidth={1.75} />
              <span className="hidden sm:inline">Links</span>
            </ToolBtn>

            {/* Forms dropdown */}
            <div className="relative">
              <ToolBtn
                active={activeTool === 'forms'}
                onClick={() => {
                  setFormsOpen((o) => !o)
                  setShapesOpen(false)
                  setAnnotateOpen(false)
                }}
                aria-expanded={formsOpen}
              >
                <ListChecks className="h-4 w-4" strokeWidth={1.75} />
                <span className="hidden sm:inline">Forms</span>
                <ChevronDown className="h-3 w-3 text-placeholder" />
              </ToolBtn>
              <DropdownMenu open={formsOpen}>
                {FORM_OPTIONS.map(({ id, label }) => (
                  <DropdownItem
                    key={id}
                    selected={formFieldVariant === id && activeTool === 'forms'}
                    onClick={() => {
                      setFormFieldVariant(id)
                      setActiveTool('forms')
                      setFormsOpen(false)
                    }}
                  >
                    {label}
                  </DropdownItem>
                ))}
              </DropdownMenu>
            </div>
          </div>

          {/* Spacer */}
          <div className="mx-1 hidden h-6 w-px bg-ring sm:block" />

          {/* Undo */}
          <div className="flex items-center rounded-btn border border-ring bg-surface p-0.5 shadow-ring">
            <ToolBtn
              disabled={!hasHistory}
              onClick={() => undoLast()}
              title="Undo last change"
            >
              <Undo2 className="h-4 w-4" strokeWidth={1.75} />
              <span className="hidden sm:inline">Undo</span>
            </ToolBtn>
            <button
              type="button"
              disabled={!hasHistory}
              onClick={() => setUndoHistoryOpen(true)}
              className="rounded-btn p-1.5 text-muted transition-colors hover:bg-primary/6 disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="Undo history"
              title="Undo history"
            >
              <ChevronDown className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* ─── Document Bar ─── */}
      <div className="relative flex flex-1 min-h-0">
        <div className="relative flex min-w-0 flex-1 flex-col">
          <div className="border-b border-ring bg-surface px-4 py-2.5">
            <div className="mx-auto flex max-w-[1000px] flex-wrap items-center gap-3">
              {/* Page indicator */}
              <span className="font-display text-2xl font-semibold tabular-nums text-near-black">
                {totalPages > 0 ? currentPage : '—'}
                <span className="text-sm font-normal text-placeholder">
                  {totalPages > 0 ? ` / ${totalPages}` : ''}
                </span>
              </span>

              {/* Zoom & page controls */}
              <div className="flex items-center gap-0.5 rounded-btn border border-ring bg-surface p-0.5 shadow-ring">
                <button
                  type="button"
                  className="rounded-[6px] p-1.5 text-muted transition-colors hover:bg-surface-alt hover:text-near-black"
                  aria-label="Delete page"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
                <div className="mx-0.5 h-4 w-px bg-ring" />
                <button
                  type="button"
                  onClick={zoomOut}
                  className="rounded-[6px] p-1.5 text-muted transition-colors hover:bg-surface-alt hover:text-near-black"
                  aria-label="Zoom out"
                >
                  <ZoomOut className="h-4 w-4" />
                </button>
                <span className="min-w-[3rem] text-center text-xs font-medium tabular-nums text-muted">
                  {Math.round(zoomLevel * 100)}%
                </span>
                <button
                  type="button"
                  onClick={zoomIn}
                  className="rounded-[6px] p-1.5 text-muted transition-colors hover:bg-surface-alt hover:text-near-black"
                  aria-label="Zoom in"
                >
                  <ZoomIn className="h-4 w-4" />
                </button>
                <div className="mx-0.5 h-4 w-px bg-ring" />
                <button
                  type="button"
                  className="rounded-[6px] p-1.5 text-muted transition-colors hover:bg-surface-alt hover:text-near-black"
                  aria-label="Rotate left"
                >
                  <RotateCcw className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  className="rounded-[6px] p-1.5 text-muted transition-colors hover:bg-surface-alt hover:text-near-black"
                  aria-label="Rotate right"
                >
                  <RotateCw className="h-4 w-4" />
                </button>
              </div>

              {/* Spacer */}
              <div className="flex-1" />

              {/* Insert page */}
              <button
                type="button"
                className="flex items-center gap-1.5 rounded-btn border border-ring bg-surface px-3 py-1.5 text-sm font-medium text-muted shadow-ring transition-colors hover:bg-surface-alt hover:text-near-black"
              >
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">
                  +
                </span>
                <span className="hidden sm:inline">Insert page</span>
              </button>

              {/* Thumbnail toggle */}
              <button
                type="button"
                onClick={onToggleThumbnails}
                className={`rounded-btn border p-2 transition-colors ${
                  thumbnailsOpen
                    ? 'border-primary bg-primary/8 text-primary'
                    : 'border-ring text-muted shadow-ring hover:bg-surface-alt'
                }`}
                aria-label={thumbnailsOpen ? 'Hide page thumbnails' : 'Show page thumbnails'}
                aria-pressed={thumbnailsOpen}
              >
                <Grid3x3 className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Canvas */}
          <div className="flex-1 overflow-auto">{children}</div>
        </div>
      </div>

      {/* ─── Help FAB ─── */}
      <button
        type="button"
        className="fixed bottom-6 right-6 z-50 flex h-11 w-11 items-center justify-center rounded-full bg-primary text-white shadow-elevated transition-shadow hover:shadow-modal"
        aria-label="Help"
      >
        <HelpCircle className="h-5 w-5" />
      </button>

      {/* ─── Signature Modal ─── */}
      <CreateSignatureModal
        open={signModalOpen}
        onClose={() => setSignModalOpen(false)}
      />
    </div>
  )
}
