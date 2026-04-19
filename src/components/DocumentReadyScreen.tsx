import {
  ArrowLeft,
  CheckCircle2,
  Download,
  FileText,
  Printer,
  RotateCcw,
  Trash2,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { usePdfEditorStore } from "../store/pdfEditorStore";
import { Button } from "./ui/Button";

export function DocumentReadyScreen() {
  const exportedBlobUrl = usePdfEditorStore((s) => s.exportedBlobUrl);
  const exportedFilename = usePdfEditorStore((s) => s.exportedFilename);
  const pdfFileName = usePdfEditorStore((s) => s.pdfFileName);
  const setCurrentView = usePdfEditorStore((s) => s.setCurrentView);
  const showToast = usePdfEditorStore((s) => s.showToast);
  const clearExportResult = usePdfEditorStore((s) => s.clearExportResult);
  const reset = usePdfEditorStore((s) => s.reset);
  const loadBlankA4 = usePdfEditorStore((s) => s.loadBlankA4);

  const [previewFailed, setPreviewFailed] = useState(false);
  const previewLoadedRef = useRef(false);

  const displayName = exportedFilename || pdfFileName || "document.pdf";

  useEffect(() => {
    if (!exportedBlobUrl) return;
    previewLoadedRef.current = false;
    const raf = window.requestAnimationFrame(() => setPreviewFailed(false));
    const t = window.setTimeout(() => {
      if (!previewLoadedRef.current) {
        setPreviewFailed(true);
      }
    }, 2000);
    return () => {
      window.cancelAnimationFrame(raf);
      window.clearTimeout(t);
    };
  }, [exportedBlobUrl]);

  const triggerDownload = (pdfa = false) => {
    if (pdfa) {
      showToast("PDF/A export is not available yet.");
      return;
    }
    const url = exportedBlobUrl;
    if (!url) {
      showToast("No exported file available.");
      return;
    }
    const a = document.createElement("a");
    a.href = url;
    a.download = exportedFilename || "document.pdf";
    a.click();
  };

  const handlePrint = () => {
    const url = exportedBlobUrl;
    if (!url) {
      showToast("No exported file to print.");
      return;
    }
    const iframe = document.createElement("iframe");
    iframe.setAttribute("aria-hidden", "true");
    Object.assign(iframe.style, {
      position: "fixed",
      right: "0",
      bottom: "0",
      width: "0",
      height: "0",
      border: "none",
    });
    iframe.src = url;
    iframe.onload = () => {
      const w = iframe.contentWindow;
      if (w) {
        w.focus();
        w.print();
      }
      window.setTimeout(() => iframe.remove(), 60_000);
    };
    document.body.appendChild(iframe);
  };

  const backToEditor = () => {
    setCurrentView("editor");
  };

  const startOver = async () => {
    clearExportResult();
    await reset();
    await loadBlankA4();
    setCurrentView("editor");
  };

  const deleteFiles = async () => {
    if (
      !window.confirm(
        "Delete this document and all edits? This cannot be undone.",
      )
    ) {
      return;
    }
    await startOver();
  };

  return (
    <div className="flex min-h-dvh flex-col bg-surface-alt text-text selection:bg-primary/10">
      {/* ─── Header ─── */}
      <header className="sticky top-0 z-20 border-b border-border bg-surface/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={backToEditor}
              className="group flex h-9 w-9 items-center justify-center rounded-lg border border-border transition-all hover:bg-surface-alt active:scale-95"
              aria-label="Back to editor"
            >
              <ArrowLeft className="h-4 w-4 text-muted transition-colors group-hover:text-text" />
            </button>
            <div className="h-4 w-px bg-border hidden sm:block" />
            <Link
              to="/"
              className="flex items-center gap-2.5 transition-opacity hover:opacity-80"
            >
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary font-display text-[11px] font-extrabold text-white">
                P
              </div>
              <span className="font-display text-lg font-extrabold tracking-tight text-text">
                PDFPro
              </span>
            </Link>
          </div>

          <div className="hidden sm:flex items-center gap-2 rounded-full border border-green/20 bg-green/5 px-3 py-1 text-[13px] font-medium text-green">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-green" />
            Document processed successfully
          </div>
        </div>
      </header>

      {/* ─── Content ─── */}
      <div className="mx-auto w-full max-w-6xl flex-1 px-6 py-12">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1fr_360px]">
          {/* Main area: Preview & Success Info */}
          <main className="min-w-0 animate-fade-in space-y-8">
            {/* Centered Success Message */}
            <div className="flex flex-col items-center text-center lg:items-start lg:text-left">
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-green/10 text-green">
                <CheckCircle2 className="h-7 w-7" strokeWidth={2.5} />
              </div>
              <h1 className="font-display text-3xl font-extrabold tracking-tight text-text sm:text-4xl">
                Your document is <span className="accent-gradient">ready!</span>
              </h1>
              <p className="mt-3 max-w-lg text-lg font-light leading-relaxed text-muted">
                We've processed{" "}
                <span className="font-medium text-text">"{displayName}"</span>.
                Everything looks great and it's ready for you to use.
              </p>
            </div>

            {/* Preview Case */}
            <div className="group relative overflow-hidden rounded-panel border border-border bg-white shadow-elevated transition-all hover:border-ring/30">
              <div className="flex items-center justify-between border-b border-border bg-surface-alt/50 px-5 py-4">
                <div className="flex items-center gap-2.5">
                  <FileText className="h-4 w-4 text-primary" />
                  <span className="text-sm font-bold tracking-tight text-text">
                    Live Preview
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={handlePrint}
                    className="text-[13px] font-medium text-muted transition-colors hover:text-primary"
                  >
                    Print
                  </button>
                </div>
              </div>

              <div className="relative min-h-[500px] bg-[#f8f9fa]">
                {exportedBlobUrl ? (
                  <>
                    {previewFailed ? (
                      <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center">
                        <div className="mb-4 text-4xl">📑</div>
                        <p className="max-w-[240px] text-sm text-muted">
                          Preview generation failed, but your download is ready.
                        </p>
                      </div>
                    ) : null}
                    <iframe
                      title="Exported PDF preview"
                      src={exportedBlobUrl}
                      className={`absolute inset-0 h-full w-full ${previewFailed ? "invisible" : ""}`}
                      onLoad={() => {
                        previewLoadedRef.current = true;
                        setPreviewFailed(false);
                      }}
                    />
                  </>
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  </div>
                )}
              </div>
            </div>
          </main>

          {/* Sidebar: Actions */}
          <aside className="animate-fade-in-up space-y-6">
            <div className="rounded-panel border border-border bg-white p-6 shadow-card">
              <h2 className="mb-5 font-display text-sm font-bold uppercase tracking-widest text-placeholder">
                Get your file
              </h2>

              <div className="space-y-4">
                {/* BIG PROMINENT DOWNLOAD */}
                <div className="relative flex flex-col gap-2">
                  <div className="group relative flex overflow-hidden rounded-xl bg-primary shadow-[0_4px_12px_rgba(255,77,46,0.15)] transition-all hover:-translate-y-0.5 hover:shadow-[0_12px_24px_rgba(255,77,46,0.25)] active:translate-y-0 active:scale-[0.98]">
                    <button
                      type="button"
                      onClick={() => triggerDownload(false)}
                      className="flex flex-1 items-center justify-center gap-3 py-4 font-display text-lg font-bold text-white transition-colors hover:bg-primary-hover"
                    >
                      <Download className="h-6 w-6" strokeWidth={2.5} />
                      Download PDF
                    </button>
                  </div>
                </div>

                <Button
                  variant="secondary"
                  className="w-full py-3.5 transition-all hover:-translate-y-0.5 hover:shadow-card active:translate-y-0"
                  onClick={handlePrint}
                >
                  <Printer className="h-4 w-4" />
                  Print Document
                </Button>
              </div>

              <div className="mt-8 border-t border-border pt-8">
                <h3 className="mb-4 font-display text-xs font-bold uppercase tracking-widest text-placeholder">
                  Next steps
                </h3>
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={backToEditor}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold text-muted transition-all hover:bg-surface-alt hover:text-text hover:-translate-x-0.5"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Back to editing
                  </button>
                  <button
                    type="button"
                    onClick={() => void startOver()}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold text-muted transition-all hover:bg-surface-alt hover:text-text hover:-translate-x-0.5"
                  >
                    <RotateCcw className="h-4 w-4" />
                    Start over
                  </button>
                  <button
                    type="button"
                    onClick={() => void deleteFiles()}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold text-destructive/70 transition-all hover:bg-destructive/5 hover:text-destructive hover:-translate-x-0.5"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete all files
                  </button>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
