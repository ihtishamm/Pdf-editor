import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Eraser,
  Highlighter,
  Image,
  Link2,
  ListChecks,
  MousePointer2,
  Pen,
  Pencil,
  Plus,
  Shapes,
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

type SidebarTab = 'tools' | 'pages'

type EditorShellProps = {
  children: ReactNode
}

/* ── Sidebar tool button ── */
function SidebarToolBtn({
  active,
  icon,
  label,
  shortcut,
  onClick,
}: {
  active?: boolean
  icon: ReactNode
  label: string
  shortcut?: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] font-normal transition-all ${
        active
          ? 'border border-[rgba(255,77,46,0.25)] bg-[rgba(255,77,46,0.1)] text-[#ff7a5c]'
          : 'border border-transparent text-[rgba(240,237,232,0.5)] hover:bg-surface-alt hover:text-text'
      }`}
    >
      <span
        className={`flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-md text-[13px] ${
          active ? 'bg-[rgba(255,77,46,0.15)]' : 'bg-surface-3'
        }`}
      >
        {icon}
      </span>
      <span className="flex-1">{label}</span>
      {shortcut ? (
        <span className="ml-auto rounded bg-surface-3 px-1.5 py-0.5 text-[10px] tracking-wider text-placeholder">
          {shortcut}
        </span>
      ) : null}
    </button>
  )
}

/* ── Sidebar sub-option button ── */
function SubOptionBtn({
  selected,
  label,
  onClick,
}: {
  selected?: boolean
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-md px-3 py-1.5 text-left text-[12px] transition-colors ${
        selected
          ? 'bg-[rgba(255,77,46,0.1)] text-[#ff7a5c]'
          : 'text-[rgba(240,237,232,0.5)] hover:bg-surface-alt hover:text-text'
      }`}
    >
      {label}
    </button>
  )
}

/* ── Toolbar icon button ── */
function TbBtn({
  children,
  onClick,
  disabled,
  title,
  active,
}: {
  children: ReactNode
  onClick?: () => void
  disabled?: boolean
  title?: string
  active?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`flex h-[30px] min-w-[30px] shrink-0 items-center justify-center gap-1.5 rounded-md border-none px-2 text-[12px] font-medium transition-all disabled:cursor-not-allowed disabled:opacity-40 ${
        active
          ? 'bg-[rgba(255,77,46,0.1)] text-[#ff7a5c]'
          : 'bg-transparent text-[rgba(240,237,232,0.5)] hover:bg-surface-alt hover:text-text'
      }`}
    >
      {children}
    </button>
  )
}

export function EditorShell({ children }: EditorShellProps) {
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
  const setPage = usePdfEditorStore((s) => s.setPage)

  const [sidebarTab, setSidebarTab] = useState<SidebarTab>('tools')
  const [shapesExpanded, setShapesExpanded] = useState(false)
  const [annotateExpanded, setAnnotateExpanded] = useState(false)
  const [formsExpanded, setFormsExpanded] = useState(false)
  const [signModalOpen, setSignModalOpen] = useState(false)
  const [undoHistoryOpen, setUndoHistoryOpen] = useState(false)

  const hasHistory = history.length > 0

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

  const collapseAllSubs = () => {
    setShapesExpanded(false)
    setAnnotateExpanded(false)
    setFormsExpanded(false)
  }

  const selectSimpleTool = (tool: typeof activeTool) => {
    collapseAllSubs()
    setActiveTool(tool)
  }

  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <UndoHistoryDialog open={undoHistoryOpen} onClose={() => setUndoHistoryOpen(false)} />

      {/* ─── TOP BAR ─── */}
      <header className="flex h-[52px] shrink-0 items-center gap-0 border-b border-[rgba(255,255,255,0.07)] bg-surface px-4">
        {/* Logo */}
        <Link to="/" className="mr-6 flex shrink-0 items-center gap-2.5">
          <span className="flex h-7 w-7 items-center justify-center rounded-[7px] bg-primary font-display text-[13px] font-extrabold text-white">
            P
          </span>
          <span className="font-display text-[15px] font-extrabold tracking-tight text-text">
            PDF Studio
          </span>
        </Link>

        {/* File name (centered) */}
        <div className="flex flex-1 items-center justify-center gap-2">
          <div className="flex items-center gap-1.5 rounded-lg border border-[rgba(255,255,255,0.07)] bg-surface-alt px-3.5 py-1.5 transition-colors hover:border-[rgba(255,255,255,0.12)]">
            <span className="text-[13px]">📄</span>
            <span className="max-w-[200px] truncate text-[13px] font-medium text-text">
              {pdfFileName || 'Untitled'}
            </span>
          </div>
        </div>

        {/* Right actions */}
        <div className="flex shrink-0 items-center gap-2">
          {/* Undo */}
          <button
            type="button"
            disabled={!hasHistory}
            onClick={() => undoLast()}
            title="Undo"
            className="flex h-8 w-8 items-center justify-center rounded-[7px] border border-[rgba(255,255,255,0.07)] text-[14px] text-[rgba(240,237,232,0.5)] transition-all hover:border-[rgba(255,255,255,0.12)] hover:bg-surface-alt hover:text-text disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Undo2 className="h-4 w-4" />
          </button>

          <div className="mx-2 h-6 w-px bg-[rgba(255,255,255,0.07)]" />

          {/* Upload */}
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
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 rounded-lg border border-[rgba(255,255,255,0.12)] bg-surface-alt px-4 py-[7px] font-body text-[13px] font-medium text-text transition-all hover:border-[rgba(255,255,255,0.18)] hover:bg-surface-3"
          >
            ⬆ Upload PDF
          </button>

          {/* Apply changes */}
          <button
            type="button"
            disabled={!pdfSourceBytes || !isLikelyPdfBytes(pdfSourceBytes) || totalPages < 1}
            onClick={handleExport}
            className="relative flex items-center gap-1.5 overflow-hidden rounded-lg bg-primary px-[18px] py-[7px] font-body text-[13px] font-medium text-white transition-all hover:bg-primary-hover hover:-translate-y-px disabled:cursor-not-allowed disabled:opacity-50"
          >
            <span className="pointer-events-none absolute inset-0 bg-linear-to-br from-white/12 to-transparent" />
            Apply changes ›
          </button>
        </div>
      </header>

      {/* ─── MAIN BODY ─── */}
      <div className="flex flex-1 overflow-hidden">
        {/* ─── LEFT SIDEBAR ─── */}
        <aside className="flex w-[220px] shrink-0 flex-col overflow-hidden border-r border-[rgba(255,255,255,0.07)] bg-surface">
          {/* Sidebar tabs */}
          <div className="flex gap-0.5 border-b border-[rgba(255,255,255,0.07)] px-2">
            {(['tools', 'pages'] as SidebarTab[]).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setSidebarTab(tab)}
                className={`border-b-2 px-2.5 py-2.5 text-[11px] font-medium uppercase tracking-wider transition-all ${
                  sidebarTab === tab
                    ? 'border-primary text-primary'
                    : 'border-transparent text-placeholder hover:text-muted'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>

          {/* Tools tab */}
          {sidebarTab === 'tools' ? (
            <div className="flex-1 overflow-y-auto px-2 py-1" style={{ scrollbarWidth: 'thin' }}>
              <div className="px-1 pb-1.5 pt-2.5 text-[10px] font-semibold uppercase tracking-[1.2px] text-placeholder">
                Edit
              </div>
              <div className="space-y-0.5">
                <SidebarToolBtn
                  active={activeTool === 'select'}
                  icon={<MousePointer2 className="h-3.5 w-3.5" />}
                  label="Select"
                  shortcut="V"
                  onClick={() => selectSimpleTool('select')}
                />
                <SidebarToolBtn
                  active={activeTool === 'text'}
                  icon={<Type className="h-3.5 w-3.5" />}
                  label="Edit Text"
                  shortcut="T"
                  onClick={() => selectSimpleTool('text')}
                />
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
                <SidebarToolBtn
                  icon={<Image className="h-3.5 w-3.5" />}
                  label="Image"
                  shortcut="I"
                  onClick={() => imageInputRef.current?.click()}
                />
              </div>

              <div className="mx-3 my-1.5 h-px bg-[rgba(255,255,255,0.07)]" />

              <div className="px-1 pb-1.5 pt-2.5 text-[10px] font-semibold uppercase tracking-[1.2px] text-placeholder">
                Markup
              </div>
              <div className="space-y-0.5">
                <SidebarToolBtn
                  active={activeTool === 'draw'}
                  icon={<Pencil className="h-3.5 w-3.5" />}
                  label="Draw"
                  shortcut="D"
                  onClick={() => selectSimpleTool('draw')}
                />

                {/* Shapes with expandable sub-options */}
                <SidebarToolBtn
                  active={activeTool === 'shapes'}
                  icon={<Shapes className="h-3.5 w-3.5" />}
                  label="Shapes"
                  shortcut="S"
                  onClick={() => {
                    setAnnotateExpanded(false)
                    setFormsExpanded(false)
                    if (activeTool !== 'shapes') {
                      setActiveTool('shapes')
                      setShapesExpanded(true)
                    } else {
                      setShapesExpanded((v) => !v)
                    }
                  }}
                />
                {shapesExpanded ? (
                  <div className="ml-9 space-y-0.5 pb-1">
                    {SHAPE_OPTIONS.map(({ id, label }) => (
                      <SubOptionBtn
                        key={id}
                        selected={shapeVariant === id && activeTool === 'shapes'}
                        label={label}
                        onClick={() => {
                          setShapeVariant(id)
                          setActiveTool('shapes')
                        }}
                      />
                    ))}
                  </div>
                ) : null}

                {/* Annotate with expandable sub-options */}
                <SidebarToolBtn
                  active={activeTool === 'annotate'}
                  icon={<Highlighter className="h-3.5 w-3.5" />}
                  label="Annotate"
                  shortcut="A"
                  onClick={() => {
                    setShapesExpanded(false)
                    setFormsExpanded(false)
                    if (activeTool !== 'annotate') {
                      setActiveTool('annotate')
                      setAnnotateExpanded(true)
                    } else {
                      setAnnotateExpanded((v) => !v)
                    }
                  }}
                />
                {annotateExpanded ? (
                  <div className="ml-9 space-y-0.5 pb-1">
                    {ANNOTATE_OPTIONS.map(({ id, label }) => (
                      <SubOptionBtn
                        key={id}
                        selected={annotateVariant === id && activeTool === 'annotate'}
                        label={label}
                        onClick={() => {
                          setAnnotateVariant(id)
                          setActiveTool('annotate')
                          if (id === 'comment') setCommentPanelOpen(true)
                        }}
                      />
                    ))}
                  </div>
                ) : null}

                <SidebarToolBtn
                  active={activeTool === 'whiteout'}
                  icon={<Eraser className="h-3.5 w-3.5" />}
                  label="Whiteout"
                  shortcut="W"
                  onClick={() => selectSimpleTool('whiteout')}
                />
              </div>

              <div className="mx-3 my-1.5 h-px bg-[rgba(255,255,255,0.07)]" />

              <div className="px-1 pb-1.5 pt-2.5 text-[10px] font-semibold uppercase tracking-[1.2px] text-placeholder">
                Insert
              </div>
              <div className="space-y-0.5">
                <SidebarToolBtn
                  active={activeTool === 'links'}
                  icon={<Link2 className="h-3.5 w-3.5" />}
                  label="Links"
                  onClick={() => selectSimpleTool('links')}
                />
                <SidebarToolBtn
                  icon={<Pen className="h-3.5 w-3.5" />}
                  label="Signature"
                  shortcut="G"
                  onClick={() => {
                    collapseAllSubs()
                    setSignModalOpen(true)
                  }}
                />

                {/* Form Fields with expandable sub-options */}
                <SidebarToolBtn
                  active={activeTool === 'forms'}
                  icon={<ListChecks className="h-3.5 w-3.5" />}
                  label="Form Fields"
                  shortcut="F"
                  onClick={() => {
                    setShapesExpanded(false)
                    setAnnotateExpanded(false)
                    if (activeTool !== 'forms') {
                      setActiveTool('forms')
                      setFormsExpanded(true)
                    } else {
                      setFormsExpanded((v) => !v)
                    }
                  }}
                />
                {formsExpanded ? (
                  <div className="ml-9 space-y-0.5 pb-1">
                    {FORM_OPTIONS.map(({ id, label }) => (
                      <SubOptionBtn
                        key={id}
                        selected={formFieldVariant === id && activeTool === 'forms'}
                        label={label}
                        onClick={() => {
                          setFormFieldVariant(id)
                          setActiveTool('forms')
                        }}
                      />
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}

          {/* Pages tab */}
          {sidebarTab === 'pages' ? (
            <div className="flex-1 overflow-y-auto p-3" style={{ scrollbarWidth: 'thin' }}>
              <div className="flex flex-col gap-2">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setPage(num)}
                    className={`flex items-center gap-2.5 rounded-lg border p-2 text-left transition-all ${
                      num === currentPage
                        ? 'border-[rgba(255,77,46,0.25)] bg-[rgba(255,77,46,0.1)]'
                        : 'border-transparent hover:border-[rgba(255,255,255,0.07)] hover:bg-surface-alt'
                    }`}
                  >
                    <div className="flex h-12 w-9 shrink-0 flex-col gap-0.5 rounded-sm border border-[rgba(255,255,255,0.1)] bg-white p-1">
                      <div className="h-0.5 w-[70%] rounded-sm bg-[#bbb]" />
                      <div className="h-0.5 w-[90%] rounded-sm bg-[#ddd]" />
                      <div className="h-0.5 w-[85%] rounded-sm bg-[#ddd]" />
                      <div className="h-0.5 w-[60%] rounded-sm bg-[#ddd]" />
                    </div>
                    <div className="flex-1">
                      <div className="text-[12px] font-medium text-text">Page {num}</div>
                      <div className="text-[10px] text-placeholder">A4</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </aside>

        {/* ─── CENTER AREA ─── */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Toolbar */}
          <div className="flex h-12 shrink-0 items-center gap-1 overflow-x-auto border-b border-[rgba(255,255,255,0.07)] bg-surface px-4" style={{ scrollbarWidth: 'none' }}>
            {/* Page nav */}
            <div className="flex items-center gap-1 rounded-[7px] border border-[rgba(255,255,255,0.07)] bg-surface-alt px-2 py-[3px] text-[12px] text-muted">
              <TbBtn
                onClick={() => { if (currentPage > 1) setPage(currentPage - 1) }}
                disabled={currentPage <= 1}
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </TbBtn>
              <span className="min-w-[14px] text-center font-medium text-text">{totalPages > 0 ? currentPage : '—'}</span>
              <span className="text-placeholder">/</span>
              <span className="min-w-[14px] text-center font-medium text-text">{totalPages > 0 ? totalPages : '—'}</span>
              <TbBtn
                onClick={() => { if (currentPage < totalPages) setPage(currentPage + 1) }}
                disabled={currentPage >= totalPages}
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </TbBtn>
            </div>

            <div className="mx-1.5 h-5 w-px shrink-0 bg-[rgba(255,255,255,0.07)]" />

            {/* Zoom */}
            <div className="flex items-center gap-0.5 rounded-[7px] border border-[rgba(255,255,255,0.07)] bg-surface-alt p-0.5">
              <TbBtn onClick={zoomOut} title="Zoom out">
                <ZoomOut className="h-3.5 w-3.5" />
              </TbBtn>
              <span className="min-w-[44px] text-center text-[12px] font-medium text-text">
                {Math.round(zoomLevel * 100)}%
              </span>
              <TbBtn onClick={zoomIn} title="Zoom in">
                <ZoomIn className="h-3.5 w-3.5" />
              </TbBtn>
            </div>

            <div className="mx-1.5 h-5 w-px shrink-0 bg-[rgba(255,255,255,0.07)]" />

            {/* Insert page */}
            <TbBtn title="Insert page">
              <Plus className="h-3.5 w-3.5" /> <span className="text-[12px]">Insert page</span>
            </TbBtn>

            <div className="flex-1" />

            {/* Undo history */}
            <div className="flex items-center gap-0.5">
              <TbBtn disabled={!hasHistory} onClick={() => undoLast()} title="Undo last change">
                <Undo2 className="h-3.5 w-3.5" />
              </TbBtn>
              <TbBtn disabled={!hasHistory} onClick={() => setUndoHistoryOpen(true)} title="Undo history">
                <ChevronDown className="h-3 w-3" />
              </TbBtn>
            </div>
          </div>

          {/* Canvas area */}
          <div className="editor-canvas-bg flex-1 overflow-auto">
            {children}
          </div>

          {/* Page bar (bottom) */}
          <div className="flex h-11 shrink-0 items-center gap-2 border-t border-[rgba(255,255,255,0.07)] bg-surface px-4">
            <span className="text-[11px] text-placeholder">Pages:</span>
            <div className="flex flex-1 items-center gap-1.5 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => setPage(num)}
                  className={`relative h-9 w-7 shrink-0 cursor-pointer rounded-[3px] border-2 bg-white transition-all ${
                    num === currentPage
                      ? 'border-primary'
                      : 'border-transparent hover:border-[rgba(255,255,255,0.18)]'
                  }`}
                >
                  <span className="absolute bottom-px w-full text-center text-[7px] text-[#999]">
                    {num}
                  </span>
                </button>
              ))}
              <button
                type="button"
                className="flex h-9 shrink-0 items-center gap-1 rounded-md border border-dashed border-[rgba(255,255,255,0.12)] bg-surface-alt px-3 text-[12px] text-placeholder transition-all hover:border-primary hover:text-primary"
              >
                ＋ Page
              </button>
            </div>
            <span className="shrink-0 text-[11px] text-placeholder">
              {totalPages > 0 ? `A4 · 794 × 1123 px` : ''}
            </span>
          </div>
        </div>

        {/* ─── RIGHT PANEL ─── */}
        <aside className="flex w-[260px] shrink-0 flex-col overflow-hidden border-l border-[rgba(255,255,255,0.07)] bg-surface">
          {/* Panel tabs */}
          <div className="flex border-b border-[rgba(255,255,255,0.07)]">
            {['Format', 'Document', 'Export'].map((tab) => (
              <button
                key={tab}
                type="button"
                className={`flex-1 border-b-2 py-[11px] text-center text-[11px] font-medium tracking-wider transition-all ${
                  tab === 'Format'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-placeholder hover:text-muted'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Format content */}
          <div className="flex-1 overflow-y-auto p-3" style={{ scrollbarWidth: 'thin' }}>
            {/* Font */}
            <div className="mb-5">
              <div className="mb-2 text-[10px] font-semibold uppercase tracking-[1.2px] text-placeholder">
                Font
              </div>
              <div className="mb-2 w-full cursor-default rounded-[7px] border border-[rgba(255,255,255,0.07)] bg-surface-alt px-2.5 py-[7px] text-[12px] text-text transition-colors hover:border-[rgba(255,255,255,0.12)]">
                DM Sans
              </div>
              <div className="flex items-center gap-1.5">
                <button type="button" className="flex h-7 w-7 items-center justify-center rounded-md border border-[rgba(255,255,255,0.07)] bg-surface-alt text-[12px] text-muted transition-colors hover:border-[rgba(255,255,255,0.12)] hover:text-text">
                  −
                </button>
                <div className="flex-1 rounded-md border border-[rgba(255,255,255,0.07)] bg-surface-alt py-1 text-center text-[12px] font-medium text-text">
                  13
                </div>
                <button type="button" className="flex h-7 w-7 items-center justify-center rounded-md border border-[rgba(255,255,255,0.07)] bg-surface-alt text-[12px] text-muted transition-colors hover:border-[rgba(255,255,255,0.12)] hover:text-text">
                  +
                </button>
              </div>
              <div className="mt-2 flex gap-1">
                {['B', 'I', 'U', 'S'].map((fmt) => (
                  <button
                    key={fmt}
                    type="button"
                    className={`flex h-7 flex-1 items-center justify-center rounded-md border text-[13px] font-bold transition-colors ${
                      fmt === 'B'
                        ? 'border-[rgba(255,77,46,0.25)] bg-[rgba(255,77,46,0.1)] text-primary'
                        : 'border-[rgba(255,255,255,0.07)] bg-surface-alt text-muted hover:border-[rgba(255,255,255,0.12)] hover:text-text'
                    }`}
                  >
                    {fmt === 'I' ? <i>{fmt}</i> : fmt === 'U' ? <u>{fmt}</u> : fmt === 'S' ? <s>{fmt}</s> : <b>{fmt}</b>}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-3.5 h-px bg-[rgba(255,255,255,0.07)]" />

            {/* Alignment */}
            <div className="mb-5">
              <div className="mb-2 text-[10px] font-semibold uppercase tracking-[1.2px] text-placeholder">
                Alignment
              </div>
              <div className="flex gap-1">
                {['⬅', '↔', '➡', '☰'].map((icon, i) => (
                  <button
                    key={icon}
                    type="button"
                    className={`flex h-7 flex-1 items-center justify-center rounded-md border text-[14px] transition-colors ${
                      i === 0
                        ? 'border-[rgba(255,77,46,0.25)] bg-[rgba(255,77,46,0.1)] text-primary'
                        : 'border-[rgba(255,255,255,0.07)] bg-surface-alt text-muted hover:border-[rgba(255,255,255,0.12)] hover:text-text'
                    }`}
                  >
                    {icon}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-3.5 h-px bg-[rgba(255,255,255,0.07)]" />

            {/* Text color */}
            <div className="mb-5">
              <div className="mb-2 text-[10px] font-semibold uppercase tracking-[1.2px] text-placeholder">
                Text Color
              </div>
              <div className="flex flex-wrap gap-1.5">
                {['#111111', '#ff4d2e', '#4d9eff', '#2dff9b', '#ffcc44', '#cc44ff'].map((c, i) => (
                  <div
                    key={c}
                    className={`h-6 w-6 shrink-0 cursor-pointer rounded-md border-2 transition-all hover:scale-110 ${
                      i === 0 ? 'border-white' : 'border-transparent'
                    }`}
                    style={{ background: c }}
                  />
                ))}
                <div
                  className="h-6 w-6 shrink-0 cursor-pointer rounded-md border-2 border-transparent transition-all hover:scale-110"
                  style={{ background: 'conic-gradient(red, yellow, lime, cyan, blue, magenta, red)' }}
                  title="Custom color"
                />
              </div>
            </div>

            <div className="mb-3.5 h-px bg-[rgba(255,255,255,0.07)]" />

            {/* Highlight color */}
            <div className="mb-5">
              <div className="mb-2 text-[10px] font-semibold uppercase tracking-[1.2px] text-placeholder">
                Highlight Color
              </div>
              <div className="flex flex-wrap gap-1.5">
                {[
                  'rgba(255,204,68,0.55)',
                  'rgba(45,255,155,0.45)',
                  'rgba(77,158,255,0.45)',
                  'rgba(255,77,46,0.45)',
                  'rgba(204,68,255,0.45)',
                ].map((c, i) => (
                  <div
                    key={c}
                    className={`h-6 w-6 shrink-0 cursor-pointer rounded-md border-2 transition-all hover:scale-110 ${
                      i === 0 ? 'border-white' : 'border-transparent'
                    }`}
                    style={{ background: c }}
                  />
                ))}
              </div>
            </div>

            <div className="mb-3.5 h-px bg-[rgba(255,255,255,0.07)]" />

            {/* Opacity */}
            <div className="mb-5">
              <div className="mb-2 text-[10px] font-semibold uppercase tracking-[1.2px] text-placeholder">
                Opacity
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min={10}
                  max={100}
                  defaultValue={100}
                  className="flex-1 accent-primary"
                />
                <span className="min-w-[32px] text-right text-[12px] font-medium text-text">100%</span>
              </div>
            </div>

            <div className="mb-3.5 h-px bg-[rgba(255,255,255,0.07)]" />

            {/* Line spacing */}
            <div className="mb-5">
              <div className="mb-2 text-[10px] font-semibold uppercase tracking-[1.2px] text-placeholder">
                Line Spacing
              </div>
              <div className="flex items-center gap-1.5">
                <button type="button" className="flex h-7 w-7 items-center justify-center rounded-md border border-[rgba(255,255,255,0.07)] bg-surface-alt text-[12px] text-muted transition-colors hover:border-[rgba(255,255,255,0.12)] hover:text-text">
                  −
                </button>
                <div className="flex-1 rounded-md border border-[rgba(255,255,255,0.07)] bg-surface-alt py-1 text-center text-[12px] font-medium text-text">
                  1.5
                </div>
                <button type="button" className="flex h-7 w-7 items-center justify-center rounded-md border border-[rgba(255,255,255,0.07)] bg-surface-alt text-[12px] text-muted transition-colors hover:border-[rgba(255,255,255,0.12)] hover:text-text">
                  +
                </button>
              </div>
            </div>
          </div>
        </aside>
      </div>

      {/* ─── Signature Modal ─── */}
      <CreateSignatureModal open={signModalOpen} onClose={() => setSignModalOpen(false)} />
    </div>
  )
}
