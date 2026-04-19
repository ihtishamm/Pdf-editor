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
  Sun,
  Moon,
  Trash2,
  Undo2,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import type { ReactNode } from "react";
import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { isLikelyPdfBytes } from "../lib/isLikelyPdfBytes";
import { usePdfEditorStore } from "../store/pdfEditorStore";
import { CreateSignatureModal } from "./CreateSignatureModal";
import { UndoHistoryDialog } from "./UndoHistoryDialog";
import type {
  AnnotateVariant,
  FormFieldVariant,
  ShapeVariant,
} from "../types/editorTools";

const SHAPE_OPTIONS: { id: ShapeVariant; label: string }[] = [
  { id: "rectangle", label: "Rectangle" },
  { id: "circle", label: "Circle" },
  { id: "line", label: "Line" },
  { id: "arrow", label: "Arrow" },
];

const ANNOTATE_OPTIONS: { id: AnnotateVariant; label: string }[] = [
  { id: "highlight", label: "Highlight" },
  { id: "underline", label: "Underline" },
  { id: "strike", label: "Strikethrough" },
  { id: "comment", label: "Comment" },
];

const FORM_OPTIONS: { id: FormFieldVariant; label: string }[] = [
  { id: "text", label: "Text Field" },
  { id: "checkbox", label: "Checkbox" },
  { id: "radio", label: "Radio Button" },
  { id: "dropdown", label: "Dropdown" },
  { id: "button", label: "Button" },
];

type EditorShellProps = {
  children: ReactNode;
};

/* ── Sidebar sub-option button ── */
function SubOptionBtn({
  selected,
  label,
  onClick,
}: {
  selected?: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-md px-3 py-1.5 text-left text-[12px] transition-colors ${
        selected
          ? "bg-[rgba(255,77,46,0.1)] text-[#ff7a5c]"
          : "text-muted hover:bg-surface-alt hover:text-text"
      }`}
    >
      {label}
    </button>
  );
}

/* ── Toolbar icon button ── */
function TbBtn({
  children,
  onClick,
  disabled,
  title,
  active,
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  title?: string;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`flex h-[30px] min-w-[30px] shrink-0 items-center justify-center gap-1.5 rounded-md border-none px-2 text-[12px] font-medium transition-all disabled:cursor-not-allowed disabled:opacity-40 ${
        active
          ? "bg-[rgba(255,77,46,0.1)] text-[#ff7a5c]"
          : "bg-transparent text-muted hover:bg-surface-alt hover:text-text"
      }`}
    >
      {children}
    </button>
  );
}

export function EditorShell({ children }: EditorShellProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const pdfFileName = usePdfEditorStore((s) => s.pdfFileName);
  const currentPage = usePdfEditorStore((s) => s.currentPage);
  const totalPages = usePdfEditorStore((s) => s.totalPages);
  const zoomLevel = usePdfEditorStore((s) => s.zoomLevel);
  const loadFile = usePdfEditorStore((s) => s.loadFile);
  const zoomIn = usePdfEditorStore((s) => s.zoomIn);
  const zoomOut = usePdfEditorStore((s) => s.zoomOut);
  const activeTool = usePdfEditorStore((s) => s.activeTool);
  const setActiveTool = usePdfEditorStore((s) => s.setActiveTool);
  const shapeVariant = usePdfEditorStore((s) => s.shapeVariant);
  const setShapeVariant = usePdfEditorStore((s) => s.setShapeVariant);
  const annotateVariant = usePdfEditorStore((s) => s.annotateVariant);
  const setAnnotateVariant = usePdfEditorStore((s) => s.setAnnotateVariant);
  const enqueueImageInsert = usePdfEditorStore((s) => s.enqueueImageInsert);
  const pdfSourceBytes = usePdfEditorStore((s) => s.pdfSourceBytes);
  const formFields = usePdfEditorStore((s) => s.formFields);
  const pdfLinks = usePdfEditorStore((s) => s.pdfLinks);
  const formFieldVariant = usePdfEditorStore((s) => s.formFieldVariant);
  const setFormFieldVariant = usePdfEditorStore((s) => s.setFormFieldVariant);
  const history = usePdfEditorStore((s) => s.history);
  const undoLast = usePdfEditorStore((s) => s.undoLast);
  const fabricByPage = usePdfEditorStore((s) => s.fabricByPage);
  const pageOverlaySnapshots = usePdfEditorStore((s) => s.pageOverlaySnapshots);
  const pdfNativeTextByPage = usePdfEditorStore((s) => s.pdfNativeTextByPage);
  const setExportResult = usePdfEditorStore((s) => s.setExportResult);
  const setCurrentView = usePdfEditorStore((s) => s.setCurrentView);
  const setIsExporting = usePdfEditorStore((s) => s.setIsExporting);
  const showToast = usePdfEditorStore((s) => s.showToast);
  const setPage = usePdfEditorStore((s) => s.setPage);
  const insertPage = usePdfEditorStore((s) => s.insertPage);
  const deletePage = usePdfEditorStore((s) => s.deletePage);
  const theme = usePdfEditorStore((s) => s.theme);
  const toggleTheme = usePdfEditorStore((s) => s.toggleTheme);

  const [signModalOpen, setSignModalOpen] = useState(false);
  const [undoHistoryOpen, setUndoHistoryOpen] = useState(false);

  const hasHistory = history.length > 0;

  const handleExport = () => {
    if (!pdfSourceBytes || totalPages < 1) return;
    if (!isLikelyPdfBytes(pdfSourceBytes)) {
      showToast(
        "The PDF file data is missing or invalid. Try opening the file again.",
      );
      return;
    }
    void (async () => {
      setIsExporting(true);
      try {
        const { runFullPdfExport } = await import("../lib/pdfExportPipeline");
        const out = await runFullPdfExport({
          originalFileBytes: pdfSourceBytes,
          fabricByPage,
          pageCount: totalPages,
          formFields,
          pdfLinks,
          baseFileName: pdfFileName || "document.pdf",
          pageOverlaySnapshots,
          pdfNativeTextByPage,
        });
        const url = URL.createObjectURL(out.blob);
        setExportResult(url, out.bytes, out.filename);
        setCurrentView("ready");
      } catch (e) {
        console.error("[EditorShell] export failed", e);
        showToast("Something went wrong. Please try again.");
      } finally {
        setIsExporting(false);
      }
    })();
  };

  const selectSimpleTool = (tool: typeof activeTool) => {
    setActiveTool(tool);
  };

  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <UndoHistoryDialog
        open={undoHistoryOpen}
        onClose={() => setUndoHistoryOpen(false)}
      />

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
              {pdfFileName || "Untitled"}
            </span>
          </div>
        </div>

        {/* Right actions */}
        <div className="flex shrink-0 items-center gap-2">
          {/* Theme Switcher */}
          <button
            type="button"
            onClick={toggleTheme}
            title={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
            className="flex h-8 w-8 items-center justify-center rounded-[7px] border border-[rgba(0,0,0,0.07)] dark:border-[rgba(255,255,255,0.07)] text-[14px] text-muted transition-all hover:bg-surface-alt hover:text-text"
          >
            {theme === "light" ? (
              <Moon className="h-4 w-4" />
            ) : (
              <Sun className="h-4 w-4" />
            )}
          </button>

          <div className="mx-2 h-6 w-px bg-border" />

          {/* Upload */}
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void loadFile(f);
              e.target.value = "";
            }}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 rounded-lg border border-border bg-surface-alt px-4 py-[7px] font-body text-[13px] font-medium text-text transition-all hover:bg-surface-3"
          >
            ⬆ Upload PDF
          </button>

          {/* Apply changes */}
          <button
            type="button"
            disabled={
              !pdfSourceBytes ||
              !isLikelyPdfBytes(pdfSourceBytes) ||
              totalPages < 1
            }
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
        <aside className="fixed inset-y-0 left-0 top-[52px] z-10 flex w-[220px] shrink-0 flex-col overflow-hidden border-r border-border bg-surface transition-transform max-md:-translate-x-full">
          {/* Sidebar title */}
          <div className="flex border-b border-border px-4 py-3">
            <span className="text-[11px] font-bold uppercase tracking-widest text-placeholder">
              Pages Preview
            </span>
          </div>

          {/* Pages list */}
          <div
            className="flex-1 overflow-y-auto p-3"
            style={{ scrollbarWidth: "thin" }}
          >
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => insertPage(0)}
                className="group flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-border py-2 text-[11px] text-placeholder transition-all hover:border-primary hover:text-primary"
              >
                <Plus className="h-3.5 w-3.5" /> Insert blank page
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                (num) => (
                  <div key={num} className="group relative">
                    <button
                      type="button"
                      onClick={() => setPage(num)}
                      className={`flex w-full items-center gap-2.5 rounded-lg border p-2 text-left transition-all ${
                        num === currentPage
                          ? "border-[rgba(255,77,46,0.25)] bg-[rgba(255,77,46,0.1)]"
                          : "border-transparent hover:border-[rgba(255,255,255,0.07)] hover:bg-surface-alt"
                      }`}
                    >
                      <div className="flex h-12 w-9 shrink-0 flex-col gap-0.5 rounded-sm border border-[rgba(255,255,255,0.1)] bg-white p-1">
                        <div className="h-0.5 w-[70%] rounded-sm bg-[#bbb]" />
                        <div className="h-0.5 w-[90%] rounded-sm bg-[#ddd]" />
                        <div className="h-0.5 w-[85%] rounded-sm bg-[#ddd]" />
                        <div className="h-0.5 w-[60%] rounded-sm bg-[#ddd]" />
                      </div>
                      <div className="flex-1">
                        <div className="text-[12px] font-medium text-text">
                          Page {num}
                        </div>
                        <div className="text-[10px] text-placeholder">A4</div>
                      </div>
                    </button>

                    {/* Page actions overlay */}
                    <div className="absolute right-2 top-2 hidden group-hover:flex items-center gap-1">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (
                            confirm(
                              `Delete page ${num}? This cannot be undone.`,
                            )
                          ) {
                            deletePage(num);
                          }
                        }}
                        className="flex h-6 w-6 items-center justify-center rounded-md bg-white/80 text-destructive shadow-sm backdrop-blur-sm transition-all hover:bg-destructive hover:text-white"
                        title="Delete page"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => insertPage(num)}
                      className="mt-1 flex w-full scale-y-0 items-center justify-center gap-1 opacity-0 transition-all group-hover:scale-y-100 group-hover:opacity-100"
                    >
                      <div className="h-px flex-1 bg-border/40 group-hover:bg-primary/20" />
                      <span className="flex h-5 w-5 items-center justify-center rounded-full border border-border bg-surface text-placeholder shadow-sm hover:border-primary hover:text-primary">
                        <Plus className="h-3 w-3" />
                      </span>
                      <div className="h-px flex-1 bg-border/40 group-hover:bg-primary/20" />
                    </button>
                  </div>
                ),
              )}
            </div>
          </div>
        </aside>

        {/* ─── CENTER AREA ─── */}
        <div className="flex flex-1 flex-col overflow-hidden md:pl-[220px]">
          {/* Main Tools Toolbar (Sticky) */}
          <div className="sticky top-0 z-[60] flex h-14 shrink-0 items-center justify-between gap-1.5 border-b border-border bg-surface px-4 py-2 shadow-sm overflow-visible">
            <div className="flex items-center gap-1 rounded-lg border border-border bg-surface-alt p-1">
              <TbBtn
                active={activeTool === "select"}
                title="Select (V)"
                onClick={() => selectSimpleTool("select")}
              >
                <MousePointer2 className="h-4 w-4" />
              </TbBtn>
              <TbBtn
                active={activeTool === "text"}
                title="Edit Text (T)"
                onClick={() => selectSimpleTool("text")}
              >
                <Type className="h-4 w-4" />
              </TbBtn>
              <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) {
                    enqueueImageInsert(f);
                    setActiveTool("select");
                  }
                  e.target.value = "";
                }}
              />
              <TbBtn
                title="Image (I)"
                onClick={() => imageInputRef.current?.click()}
              >
                <Image className="h-4 w-4" />
              </TbBtn>
            </div>

            <div className="h-6 w-px bg-border" />

            <div className="flex items-center gap-1 rounded-lg border border-border bg-surface-alt p-1">
              <TbBtn
                active={activeTool === "draw"}
                title="Draw (D)"
                onClick={() => selectSimpleTool("draw")}
              >
                <Pencil className="h-4 w-4" />
              </TbBtn>

              {/* Shapes Dropdown Simulation */}
              <div className="relative group">
                <TbBtn
                  active={activeTool === "shapes"}
                  title="Shapes (S)"
                  onClick={() => setActiveTool("shapes")}
                >
                  <Shapes className="h-4 w-4" />
                  <ChevronDown className="h-3 w-3" />
                </TbBtn>
                <div className="absolute left-0 top-full hidden pt-1 group-hover:block z-[100]">
                  <div className="min-w-[140px] rounded-lg border border-border bg-surface shadow-2xl p-1.5">
                    {SHAPE_OPTIONS.map(({ id, label }) => (
                      <SubOptionBtn
                        key={id}
                        selected={
                          shapeVariant === id && activeTool === "shapes"
                        }
                        label={label}
                        onClick={() => {
                          setShapeVariant(id);
                          setActiveTool("shapes");
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Annotate Dropdown Simulation */}
              <div className="relative group">
                <TbBtn
                  active={activeTool === "annotate"}
                  title="Annotate (A)"
                  onClick={() => setActiveTool("annotate")}
                >
                  <Highlighter className="h-4 w-4" />
                  <ChevronDown className="h-3 w-3" />
                </TbBtn>
                <div className="absolute left-0 top-full hidden pt-1 group-hover:block z-[100]">
                  <div className="min-w-[140px] rounded-lg border border-border bg-surface shadow-2xl p-1.5">
                    {ANNOTATE_OPTIONS.map(({ id, label }) => (
                      <SubOptionBtn
                        key={id}
                        selected={
                          annotateVariant === id && activeTool === "annotate"
                        }
                        label={label}
                        onClick={() => {
                          setAnnotateVariant(id);
                          setActiveTool("annotate");
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <TbBtn
                active={activeTool === "whiteout"}
                title="Whiteout (W)"
                onClick={() => selectSimpleTool("whiteout")}
              >
                <Eraser className="h-4 w-4" />
              </TbBtn>
            </div>

            <div className="h-6 w-px bg-border" />

            <div className="flex items-center gap-1 rounded-lg border border-border bg-surface-alt p-1">
              <TbBtn
                active={activeTool === "links"}
                title="Links"
                onClick={() => selectSimpleTool("links")}
              >
                <Link2 className="h-4 w-4" />
              </TbBtn>
              <TbBtn
                title="Signature (G)"
                onClick={() => {
                  setSignModalOpen(true);
                }}
              >
                <Pen className="h-4 w-4" />
              </TbBtn>

              {/* Forms Dropdown Simulation */}
              <div className="relative group">
                <TbBtn
                  active={activeTool === "forms"}
                  title="Form Fields (F)"
                  onClick={() => setActiveTool("forms")}
                >
                  <ListChecks className="h-4 w-4" />
                  <ChevronDown className="h-3 w-3" />
                </TbBtn>
                <div className="absolute left-0 top-full hidden pt-1 group-hover:block z-20">
                  <div className="min-w-[140px] rounded-lg border border-border bg-surface shadow-xl p-1">
                    {FORM_OPTIONS.map(({ id, label }) => (
                      <SubOptionBtn
                        key={id}
                        selected={
                          formFieldVariant === id && activeTool === "forms"
                        }
                        label={label}
                        onClick={() => {
                          setFormFieldVariant(id);
                          setActiveTool("forms");
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="h-6 w-px bg-border" />

            {/* Existing Page Nav & Zoom */}
            <div className="flex items-center gap-1 rounded-lg border border-border bg-surface-alt p-1">
              <TbBtn
                onClick={() => {
                  if (currentPage > 1) setPage(currentPage - 1);
                }}
                disabled={currentPage <= 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </TbBtn>
              <div className="flex items-center gap-1 px-2 text-[13px] font-medium text-text">
                <span>{totalPages > 0 ? currentPage : "—"}</span>
                <span className="text-placeholder">/</span>
                <span>{totalPages > 0 ? totalPages : "—"}</span>
              </div>
              <TbBtn
                onClick={() => {
                  if (currentPage < totalPages) setPage(currentPage + 1);
                }}
                disabled={currentPage >= totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </TbBtn>
            </div>

            <div className="flex items-center gap-0.5 rounded-lg border border-border bg-surface-alt p-1">
              <TbBtn
                onClick={zoomOut}
                title="Zoom out"
                disabled={zoomLevel <= 0.5}
              >
                <ZoomOut className="h-3.5 w-3.5" />
              </TbBtn>
              <span className="min-w-[44px] text-center text-[12px] font-medium text-text">
                {Math.round(zoomLevel * 100)}%
              </span>
              <TbBtn
                onClick={zoomIn}
                title="Zoom in"
                disabled={zoomLevel >= 1.0}
              >
                <ZoomIn className="h-3.5 w-3.5" />
              </TbBtn>
            </div>

            <div className="h-6 w-px bg-border" />

            <TbBtn
              onClick={() => insertPage(totalPages)}
              title="Append blank page"
            >
              <Plus className="h-4 w-4" />
            </TbBtn>

            <div className="flex-1" />

            {/* Undo history */}
            <div className="flex items-center gap-1 rounded-lg border border-border bg-surface-alt p-1">
              <TbBtn
                disabled={!hasHistory}
                onClick={() => undoLast()}
                title="Undo last change"
              >
                <Undo2 className="h-4 w-4" />
              </TbBtn>
              <TbBtn
                disabled={!hasHistory}
                onClick={() => setUndoHistoryOpen(true)}
                title="Undo history"
              >
                <ChevronDown className="h-4 w-4" />
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
            <div
              className="flex flex-1 items-center gap-1.5 overflow-x-auto"
              style={{ scrollbarWidth: "none" }}
            >
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                (num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setPage(num)}
                    className={`relative h-9 w-7 shrink-0 cursor-pointer rounded-[3px] border-2 bg-white transition-all ${
                      num === currentPage
                        ? "border-primary"
                        : "border-transparent hover:border-[rgba(255,255,255,0.18)]"
                    }`}
                  >
                    <span className="absolute bottom-px w-full text-center text-[7px] text-[#999]">
                      {num}
                    </span>
                  </button>
                ),
              )}
              <button
                type="button"
                onClick={() => insertPage(totalPages)}
                className="flex h-9 shrink-0 items-center gap-1 rounded-md border border-dashed border-[rgba(255,255,255,0.12)] bg-surface-alt px-3 text-[12px] text-placeholder transition-all hover:border-primary hover:text-primary"
              >
                <Plus className="h-3 w-3" /> Page
              </button>
            </div>
            <span className="shrink-0 text-[11px] text-placeholder">
              {totalPages > 0 ? `A4 · 794 × 1123 px` : ""}
            </span>
          </div>
        </div>
      </div>

      {/* ─── Signature Modal ─── */}
      <CreateSignatureModal
        open={signModalOpen}
        onClose={() => setSignModalOpen(false)}
      />
    </div>
  );
}
