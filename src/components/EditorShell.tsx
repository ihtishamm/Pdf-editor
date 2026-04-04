import {
  ChevronRight,
  Eraser,
  Globe,
  Grid3x3,
  HelpCircle,
  Highlighter,
  Image,
  Link2,
  ListChecks,
  MousePointer2,
  Pen,
  RotateCcw,
  RotateCw,
  Shapes,
  Trash2,
  Undo2,
  ZoomIn,
  ZoomOut,
} from 'lucide-react'
import type { ReactNode } from 'react'
import { useRef } from 'react'
import { usePdfEditorStore } from '../store/pdfEditorStore'

const NAV_LINKS = [
  'All Tools',
  'Compress',
  'Edit',
  'Fill & Sign',
  'Merge',
  'Delete Pages',
  'Crop',
] as const

const TOOL_GROUPS = [
  { label: 'Text', Icon: MousePointer2 },
  { label: 'Links', Icon: Link2 },
  { label: 'Forms', Icon: ListChecks },
  { label: 'Images', Icon: Image },
  { label: 'Sign', Icon: Pen },
  { label: 'Whiteout', Icon: Eraser },
  { label: 'Annotate', Icon: Highlighter },
  { label: 'Shapes', Icon: Shapes },
  { label: 'Undo', Icon: Undo2 },
] as const

type EditorShellProps = {
  children: ReactNode
  thumbnailsOpen: boolean
  onToggleThumbnails: () => void
}

export function EditorShell({
  children,
  thumbnailsOpen,
  onToggleThumbnails,
}: EditorShellProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const pdfFileName = usePdfEditorStore((s) => s.pdfFileName)
  const currentPage = usePdfEditorStore((s) => s.currentPage)
  const totalPages = usePdfEditorStore((s) => s.totalPages)
  const zoomLevel = usePdfEditorStore((s) => s.zoomLevel)
  const loadFile = usePdfEditorStore((s) => s.loadFile)
  const zoomIn = usePdfEditorStore((s) => s.zoomIn)
  const zoomOut = usePdfEditorStore((s) => s.zoomOut)
  const activeTool = usePdfEditorStore((s) => s.activeTool)
  const setActiveTool = usePdfEditorStore((s) => s.setActiveTool)

  return (
    <div className="relative flex min-h-dvh flex-col bg-[#f3f3f3] text-[#333]">
      <header className="sticky top-0 z-50 border-b border-[#e0e0e0] bg-white">
        <div className="mx-auto flex max-w-[1280px] items-center justify-between gap-4 px-6 py-3">
          <div className="flex items-center gap-2">
            <span
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#00a67e] text-lg font-semibold text-white"
              aria-hidden
            >
              P
            </span>
            <span className="text-lg font-semibold tracking-tight text-[#333]">
              PDF Studio
            </span>
          </div>
          <nav className="hidden flex-wrap items-center justify-center gap-x-6 gap-y-1 text-sm text-[#444] md:flex">
            {NAV_LINKS.map((label) => (
              <a
                key={label}
                href="#"
                className="whitespace-nowrap hover:text-[#00a67e]"
                onClick={(e) => e.preventDefault()}
              >
                {label === 'All Tools' ? (
                  <span className="inline-flex items-center gap-0.5">
                    {label}
                    <span className="text-[10px]" aria-hidden>
                      ▾
                    </span>
                  </span>
                ) : (
                  label
                )}
              </a>
            ))}
          </nav>
          <div className="flex shrink-0 items-center gap-4 text-sm text-[#444]">
            <a href="#" className="hover:text-[#00a67e]" onClick={(e) => e.preventDefault()}>
              Pricing
            </a>
            <a href="#" className="hover:text-[#00a67e]" onClick={(e) => e.preventDefault()}>
              Desktop
            </a>
            <a href="#" className="hover:text-[#00a67e]" onClick={(e) => e.preventDefault()}>
              Log in
            </a>
            <button
              type="button"
              className="rounded p-1 text-[#666] hover:bg-slate-100"
              aria-label="Language"
            >
              <Globe className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      <div className="border-b border-[#e8e8e8] bg-white px-6 py-4 text-center">
        <h1 className="text-2xl font-semibold text-[#333] md:text-[28px]">
          Online PDF editor{' '}
          <span className="align-middle text-sm font-semibold uppercase tracking-wide text-[#00a67e]">
            BETA
          </span>
        </h1>
        <p className="mt-1 text-sm text-[#666]">
          Edit PDF files for free. Fill & sign PDF
        </p>
      </div>

      <div className="sticky z-40 border-b border-[#e8e8e8] bg-[#fafafa] px-4 py-3">
        <div className="mx-auto flex max-w-[920px] flex-wrap justify-center">
          <div className="inline-flex overflow-hidden rounded-md border border-[#b3d7ff] bg-white shadow-sm">
            {TOOL_GROUPS.map(({ label, Icon }, i) => {
              const isText = label === 'Text'
              const textActive = isText && activeTool === 'text'
              return (
                <button
                  key={label}
                  type="button"
                  disabled={!isText}
                  aria-disabled={!isText}
                  aria-pressed={isText ? textActive : undefined}
                  onClick={() => {
                    if (!isText) return
                    setActiveTool(activeTool === 'text' ? 'select' : 'text')
                  }}
                  className={`flex min-h-[40px] items-center gap-1.5 px-3 py-2 text-sm ${
                    isText ? 'text-[#333]' : 'cursor-not-allowed text-[#aaa]'
                  } ${textActive ? 'bg-[#f0f8ff]' : ''} ${
                    i > 0 ? 'border-l border-[#b3d7ff]' : ''
                  }`}
                >
                  <Icon
                    className={`h-4 w-4 shrink-0 ${isText ? 'text-[#40a9ff]' : 'text-[#ccc]'}`}
                    strokeWidth={1.75}
                  />
                  <span>{label}</span>
                  {label !== 'Undo' && label !== 'Whiteout' ? (
                    <span className="text-[10px] text-[#888]" aria-hidden>
                      ▾
                    </span>
                  ) : null}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      <div className="relative flex flex-1 min-h-0">
        <div className="relative flex min-w-0 flex-1 flex-col">
          <div className="sticky top-0 z-30 border-b border-transparent bg-[#f3f3f3] px-4 pt-4">
            <div className="mx-auto flex max-w-[920px] flex-wrap items-center gap-3">
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
                className="rounded border border-[#b3d7ff] bg-white px-3 py-1.5 text-sm font-medium text-[#333] shadow-sm hover:bg-[#f0f8ff]"
              >
                Upload PDF
              </button>
              <span
                className="max-w-[200px] truncate text-xs text-[#666]"
                title={pdfFileName}
              >
                {pdfFileName || '—'}
              </span>
              <span className="text-4xl font-light leading-none text-[#b3d7ff]">
                {totalPages > 0 ? currentPage : '—'}
              </span>
              <div className="flex items-center gap-0.5 rounded border border-[#b3d7ff] bg-white p-0.5">
                <button
                  type="button"
                  className="rounded p-1.5 text-[#666] hover:bg-[#f0f8ff]"
                  aria-label="Delete page"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={zoomOut}
                  className="rounded p-1.5 text-[#666] hover:bg-[#f0f8ff]"
                  aria-label="Zoom out"
                >
                  <ZoomOut className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={zoomIn}
                  className="rounded p-1.5 text-[#666] hover:bg-[#f0f8ff]"
                  aria-label="Zoom in"
                >
                  <ZoomIn className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  className="rounded p-1.5 text-[#666] hover:bg-[#f0f8ff]"
                  aria-label="Rotate left"
                >
                  <RotateCcw className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  className="rounded p-1.5 text-[#666] hover:bg-[#f0f8ff]"
                  aria-label="Rotate right"
                >
                  <RotateCw className="h-4 w-4" />
                </button>
              </div>
              <button
                type="button"
                className="ml-auto flex items-center gap-1 rounded border border-[#b3d7ff] bg-white px-2 py-1 text-sm text-[#333] hover:bg-[#f0f8ff]"
              >
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#40a9ff] text-xs font-bold text-white">
                  +
                </span>
                Insert page here
              </button>
              <span className="text-xs tabular-nums text-[#888]">
                {Math.round(zoomLevel * 100)}%
              </span>
            </div>
          </div>

          <div className="flex-1 overflow-auto">{children}</div>
        </div>

        <button
          type="button"
          onClick={onToggleThumbnails}
          className={`absolute right-2 top-24 z-30 hidden rounded border bg-white p-2 shadow-sm md:block ${
            thumbnailsOpen ? 'border-[#40a9ff] text-[#40a9ff]' : 'border-[#d9d9d9] text-[#666]'
          }`}
          aria-label={thumbnailsOpen ? 'Hide page thumbnails' : 'Show page thumbnails'}
          aria-pressed={thumbnailsOpen}
        >
          <Grid3x3 className="h-5 w-5" />
        </button>
      </div>

      <div className="pointer-events-none fixed bottom-6 left-1/2 z-50 -translate-x-1/2">
        <button
          type="button"
          className="pointer-events-auto flex items-center gap-2 rounded-lg bg-[#00a67e] px-10 py-3 text-base font-medium text-white shadow-lg hover:bg-[#00916d]"
        >
          Apply changes
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      <button
        type="button"
        className="fixed bottom-6 right-6 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-[#00a67e] text-white shadow-lg hover:bg-[#00916d]"
        aria-label="Help"
      >
        <HelpCircle className="h-6 w-6" />
      </button>

      <button
        type="button"
        onClick={onToggleThumbnails}
        className="fixed right-3 top-1/2 z-30 -translate-y-1/2 rounded border bg-white p-2 shadow-sm md:hidden"
        aria-label="Toggle thumbnails"
      >
        <Grid3x3 className="h-5 w-5" />
      </button>
    </div>
  )
}
