import { Canvas, type FabricObject } from "fabric";
import { Trash2, X } from "lucide-react";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { getPdfLinkId, isPdfLinkObject } from "../lib/fabricPdfLink";
import { usePdfEditorStore } from "../store/pdfEditorStore";
import type { PdfLinkType } from "../types/pdfLinks";
import type { EditorTool } from "../types/editorTools";

type LinkPropertiesPopoverProps = {
  canvas: Canvas | null;
  activeTool: EditorTool;
};

const PANEL_W = 320;

const TYPE_OPTIONS: { id: PdfLinkType; label: string; placeholder: string }[] =
  [
    { id: "url", label: "Link to external URL", placeholder: "https://…" },
    {
      id: "email",
      label: "Link to email address",
      placeholder: "you@example.com",
    },
    { id: "phone", label: "Link to phone number", placeholder: "+1234567890" },
    { id: "page", label: "Link to internal page", placeholder: "Page number" },
  ];

export function LinkPropertiesPopover({
  canvas,
  activeTool,
}: LinkPropertiesPopoverProps) {
  const popoverRef = useRef<HTMLDivElement>(null);
  const [target, setTarget] = useState<FabricObject | null>(null);
  const [tick, setTick] = useState(0);

  const pdfLinks = usePdfEditorStore((s) => s.pdfLinks);
  const updatePdfLink = usePdfEditorStore((s) => s.updatePdfLink);
  const removePdfLink = usePdfEditorStore((s) => s.removePdfLink);
  const setSelectedPdfLinkId = usePdfEditorStore((s) => s.setSelectedPdfLinkId);

  const bump = useCallback(() => {
    setTick((t) => t + 1);
  }, []);

  useEffect(() => {
    if (!canvas || activeTool !== "links") return;
    const syncSelection = () => {
      const o = canvas.getActiveObject();
      setTarget(o && isPdfLinkObject(o) ? o : null);
    };
    const clearSelection = () => setTarget(null);

    syncSelection();
    canvas.on("selection:created", syncSelection);
    canvas.on("selection:updated", syncSelection);
    canvas.on("selection:cleared", clearSelection);
    canvas.on("object:modified", syncSelection);

    return () => {
      canvas.off("selection:created", syncSelection);
      canvas.off("selection:updated", syncSelection);
      canvas.off("selection:cleared", clearSelection);
      canvas.off("object:modified", syncSelection);
    };
  }, [canvas, activeTool]);

  useLayoutEffect(() => {
    if (!canvas || !target || !popoverRef.current) return;
    const el = popoverRef.current;

    const updatePosition = () => {
      const bound = target.getBoundingRect();
      const br = canvas.upperCanvasEl.getBoundingClientRect();

      const elWidth = el.offsetWidth || PANEL_W;
      const margin = 12;

      // Position above the link rect by default
      let top = br.top + bound.top - 200;
      // If it would go off the top, place it below
      if (top < 64) {
        top = br.top + bound.top + bound.height + margin;
      }

      let left = br.left + bound.left + bound.width / 2 - elWidth / 2;
      // Clamp to screen edges
      if (left < margin) left = margin;
      if (left + elWidth > window.innerWidth - margin) {
        left = window.innerWidth - elWidth - margin;
      }

      el.style.left = `${left}px`;
      el.style.top = `${top}px`;
    };

    updatePosition();
    const rafId = requestAnimationFrame(updatePosition);
    return () => cancelAnimationFrame(rafId);
  }, [canvas, target, tick]);

  const linkId = target ? getPdfLinkId(target) : null;
  const entry = linkId ? pdfLinks.find((l) => l.id === linkId) : null;

  if (!target || !canvas || activeTool !== "links" || !entry) {
    return null;
  }

  const handleTypeChange = (t: PdfLinkType) => {
    if (linkId) {
      updatePdfLink(linkId, { linkType: t });
      bump();
    }
  };

  const handleValueChange = (value: string) => {
    if (linkId) {
      updatePdfLink(linkId, { value });
      bump();
    }
  };

  const handleDelete = () => {
    if (canvas && linkId) {
      removePdfLink(linkId);
      setSelectedPdfLinkId(null);
      canvas.discardActiveObject();
      canvas.requestRenderAll();
      setTarget(null);
    }
  };

  const activeOption =
    TYPE_OPTIONS.find((o) => o.id === entry.linkType) ?? TYPE_OPTIONS[0]!;

  return createPortal(
    <div
      ref={popoverRef}
      role="dialog"
      aria-labelledby="link-props-title"
      className="fixed z-120 w-[min(calc(100vw-16px),320px)] rounded-lg border border-ring bg-surface-alt p-4 shadow-elevated"
    >
      <div className="mb-3 flex items-start justify-between gap-2">
        <h2 id="link-props-title" className="text-sm font-semibold text-text">
          Link Properties
        </h2>
        <button
          type="button"
          className="shrink-0 rounded p-1 text-muted hover:bg-surface-3"
          aria-label="Close"
          onClick={() => {
            canvas.discardActiveObject();
            canvas.requestRenderAll();
          }}
        >
          <X className="h-4 w-4" strokeWidth={1.75} />
        </button>
      </div>

      <fieldset className="space-y-2 border-0 p-0">
        <legend className="sr-only">Link destination</legend>
        {TYPE_OPTIONS.map((opt) => (
          <label
            key={opt.id}
            className="flex cursor-pointer items-start gap-2 rounded px-1 py-1 text-sm hover:bg-surface-3"
          >
            <input
              type="radio"
              name="pdf-link-type"
              className="mt-1"
              checked={entry.linkType === opt.id}
              onChange={() => handleTypeChange(opt.id)}
            />
            <span className="text-text">{opt.label}</span>
          </label>
        ))}
      </fieldset>

      <div className="mt-3">
        <label className="block">
          <span className="sr-only">{activeOption.label}</span>
          <input
            type={
              entry.linkType === "page"
                ? "number"
                : entry.linkType === "email"
                  ? "email"
                  : "text"
            }
            min={entry.linkType === "page" ? 1 : undefined}
            className="w-full rounded border border-ring bg-surface-3 px-2 py-2 text-sm text-text"
            placeholder={activeOption.placeholder}
            value={entry.value}
            onChange={(e) => handleValueChange(e.target.value)}
            autoComplete="off"
          />
        </label>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={handleDelete}
          className="inline-flex items-center gap-1.5 rounded border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive hover:bg-destructive/20"
        >
          <Trash2 className="h-4 w-4 shrink-0" strokeWidth={1.75} />
          Delete link
        </button>
        <button
          type="button"
          onClick={() => {
            canvas.discardActiveObject();
            canvas.requestRenderAll();
          }}
          className="ml-auto rounded border border-ring bg-surface-3 px-3 py-2 text-sm text-text hover:bg-surface-3/80"
        >
          Close
        </button>
      </div>
    </div>,
    document.body,
  );
}
