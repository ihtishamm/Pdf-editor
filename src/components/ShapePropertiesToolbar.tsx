import { Trash2 } from "lucide-react";
import { Canvas, type FabricObject } from "fabric";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import {
  isAnnotateToolObject,
  isOverlayPropertiesObject,
  isShapeToolObject,
  isWhiteoutObject,
} from "../lib/fabricCanvasTools";
import type { EditorTool } from "../types/editorTools";

type ShapePropertiesToolbarProps = {
  canvas: Canvas | null;
  activeTool: EditorTool;
};

function colorToHex(input: string | undefined | null): string {
  if (!input || input === "transparent") return "#1f2937";
  if (input.startsWith("#") && (input.length === 4 || input.length === 7)) {
    return input;
  }
  const m = String(input).match(/rgba?\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
  if (m) {
    const r = Number(m[1]).toString(16).padStart(2, "0");
    const g = Number(m[2]).toString(16).padStart(2, "0");
    const b = Number(m[3]).toString(16).padStart(2, "0");
    return `#${r}${g}${b}`;
  }
  return "#1f2937";
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const h = hex.replace("#", "");
  if (h.length === 3) {
    return {
      r: parseInt(h[0]! + h[0]!, 16),
      g: parseInt(h[1]! + h[1]!, 16),
      b: parseInt(h[2]! + h[2]!, 16),
    };
  }
  if (h.length === 6) {
    return {
      r: parseInt(h.slice(0, 2), 16),
      g: parseInt(h.slice(2, 4), 16),
      b: parseInt(h.slice(4, 6), 16),
    };
  }
  return null;
}

function parseRgbaAlpha(fill: string): number {
  const m = fill.match(
    /rgba?\s*\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*(?:,\s*([\d.]+)\s*)?\)/i,
  );
  if (!m) return 1;
  return m[1] !== undefined ? Number(m[1]) : 1;
}

function buildRgbaFromHex(hex: string, alpha: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return `rgba(255,255,255,${alpha})`;
  const a = Math.min(1, Math.max(0, alpha));
  return `rgba(${rgb.r},${rgb.g},${rgb.b},${a})`;
}

type OverlayKind = "shape" | "whiteout" | "annotate-hl" | "annotate-line";

function getOverlayKind(o: FabricObject): OverlayKind | null {
  if (isWhiteoutObject(o)) return "whiteout";
  if (isShapeToolObject(o)) return "shape";
  if (isAnnotateToolObject(o)) {
    const v = (o as FabricObject & { data?: { variant?: string } }).data
      ?.variant;
    return v === "highlight" ? "annotate-hl" : "annotate-line";
  }
  return null;
}

/**
 * Floating bar for shapes, annotations, and whiteout when selected in select mode.
 */
export function ShapePropertiesToolbar({
  canvas,
  activeTool,
}: ShapePropertiesToolbarProps) {
  const toolbarRef = useRef<HTMLDivElement>(null);
  const [target, setTarget] = useState<FabricObject | null>(null);
  const [tick, setTick] = useState(0);

  const bump = useCallback(() => {
    setTick((t) => t + 1);
  }, []);

  useEffect(() => {
    if (!canvas) return;
    const sync = () => {
      const o = canvas.getActiveObject();
      setTarget(o && isOverlayPropertiesObject(o) ? o : null);
    };
    const onCleared = () => setTarget(null);
    sync();
    canvas.on("selection:created", sync);
    canvas.on("selection:updated", sync);
    canvas.on("selection:cleared", onCleared);
    canvas.on("object:modified", sync);
    return () => {
      canvas.off("selection:created", sync);
      canvas.off("selection:updated", sync);
      canvas.off("selection:cleared", onCleared);
      canvas.off("object:modified", sync);
    };
  }, [canvas, activeTool]);

  useLayoutEffect(() => {
    if (!canvas || !target || !toolbarRef.current) return;
    const el = toolbarRef.current;
    const place = () => {
      const bound = target.getBoundingRect();
      const br = canvas.upperCanvasEl.getBoundingClientRect();

      const elWidth = el.offsetWidth || 300;
      const margin = 12;

      let top = br.top + bound.top - 110;
      if (top < 120) top = br.top + bound.top + bound.height + 12;

      let left = br.left + bound.left + bound.width / 2 - elWidth / 2;
      if (left < margin) left = margin;
      if (left + elWidth > window.innerWidth - margin) {
        left = window.innerWidth - elWidth - margin;
      }

      el.style.left = `${left}px`;
      el.style.top = `${top}px`;
    };
    place();
    const raf = requestAnimationFrame(place);
    return () => cancelAnimationFrame(raf);
  }, [canvas, target, tick]);

  useEffect(() => {
    if (!canvas || !target) return;
    const onAfter = () => bump();
    canvas.on("after:render", onAfter);
    return () => {
      canvas.off("after:render", onAfter);
    };
  }, [canvas, target, bump]);

  const apply = useCallback(
    (
      patch: Partial<{
        stroke: string;
        fill: string;
        strokeWidth: number;
        opacity: number;
      }>,
    ) => {
      if (!canvas || !target) return;
      target.set(patch);
      target.setCoords();
      canvas.requestRenderAll();
      bump();
    },
    [canvas, target, bump],
  );

  const onDelete = () => {
    if (!canvas || !target) return;
    canvas.remove(target);
    canvas.discardActiveObject();
    canvas.requestRenderAll();
  };

  if (!target || !canvas) {
    return null;
  }

  const kind = getOverlayKind(target);
  if (!kind) return null;

  const stroke = colorToHex(
    typeof target.stroke === "string" ? target.stroke : undefined,
  );
  const fillRaw = target.fill;
  const fillStr =
    typeof fillRaw === "string"
      ? fillRaw
      : fillRaw == null
        ? "transparent"
        : "";
  const fillHex =
    fillStr === "" ||
    fillStr === "transparent" ||
    fillStr.startsWith("rgba") ||
    fillStr.startsWith("rgb")
      ? colorToHex(
          fillStr.startsWith("rgba") || fillStr.startsWith("rgb")
            ? fillStr
            : "#ffffff",
        )
      : colorToHex(fillStr);
  const fillForPicker =
    fillStr === "transparent" || fillStr === "" ? "#ffffff" : fillHex;
  const strokeWidth = Math.max(
    0,
    typeof target.strokeWidth === "number" ? target.strokeWidth : 0,
  );
  const objectOpacity = typeof target.opacity === "number" ? target.opacity : 1;
  const highlightFillAlpha =
    kind === "annotate-hl" && typeof fillStr === "string"
      ? parseRgbaAlpha(fillStr)
      : 1;

  const title =
    kind === "whiteout"
      ? "Whiteout"
      : kind === "shape"
        ? "Shape"
        : kind === "annotate-hl"
          ? "Highlight"
          : "Annotation";

  return createPortal(
    <div
      ref={toolbarRef}
      className="fixed z-100 flex max-w-[min(100vw-16px,480px)] flex-wrap items-center gap-2 rounded-lg border border-ring bg-surface-alt px-3 py-2 text-sm shadow-elevated"
      role="toolbar"
      aria-label={`${title} properties`}
    >
      <span className="text-xs font-medium text-muted">{title}</span>

      {(kind === "shape" ||
        kind === "whiteout" ||
        kind === "annotate-line") && (
        <div className="flex items-center gap-1.5 mr-2">
          {[
            "#1f2937",
            "#dc2626",
            "#2563eb",
            "#059669",
            "#d97706",
            "#7c3aed",
          ].map((c) => (
            <button
              key={c}
              type="button"
              className={`h-5 w-5 rounded-full border border-border shadow-sm transition-transform hover:scale-110 ${
                stroke === c ? "ring-1 ring-primary ring-offset-1" : ""
              }`}
              style={{ background: c }}
              onClick={() => apply({ stroke: c })}
            />
          ))}
          <input
            type="color"
            className="h-6 w-6 cursor-pointer rounded-full border border-border bg-surface-3 p-0"
            value={stroke}
            onChange={(e) => apply({ stroke: e.target.value })}
          />
        </div>
      )}

      {(kind === "shape" || kind === "whiteout" || kind === "annotate-hl") && (
        <div className="flex items-center gap-1.5 mr-2">
          {kind === "annotate-hl"
            ? [
                "rgba(255, 255, 0, 0.35)", // Yellow
                "rgba(34, 197, 94, 0.35)", // Green
                "rgba(59, 130, 246, 0.35)", // Blue
                "rgba(244, 114, 182, 0.35)", // Pink
                "rgba(239, 68, 68, 0.35)", // Red
              ].map((c) => (
                <button
                  key={c}
                  type="button"
                  className={`h-5 w-5 rounded-full border border-border shadow-sm transition-transform hover:scale-110 ${
                    fillStr === c ? "ring-1 ring-primary ring-offset-1" : ""
                  }`}
                  style={{ background: c }}
                  onClick={() => apply({ fill: c })}
                />
              ))
            : [
                "#ffffff",
                "#ff4d2e",
                "#ffcc44",
                "#2dff9b",
                "#2563eb",
                "transparent",
              ].map((c) => (
                <button
                  key={c}
                  type="button"
                  className={`h-5 w-5 rounded-full border border-border shadow-sm transition-transform hover:scale-110 ${
                    fillStr === c ? "ring-1 ring-primary ring-offset-1" : ""
                  }`}
                  style={{ background: c === "transparent" ? "white" : c }}
                  onClick={() => apply({ fill: c })}
                >
                  {c === "transparent" && (
                    <div className="h-px w-full rotate-45 bg-destructive" />
                  )}
                </button>
              ))}
          {kind !== "annotate-hl" && (
            <input
              type="color"
              className="h-6 w-6 cursor-pointer rounded-full border border-border bg-surface-3 p-0"
              value={fillForPicker}
              onChange={(e) => apply({ fill: e.target.value })}
            />
          )}
        </div>
      )}

      {kind === "annotate-hl" && (
        <label className="flex items-center gap-1">
          <span className="text-muted">Fill α</span>
          <input
            type="range"
            min={0}
            max={100}
            className="w-24"
            value={Math.round(highlightFillAlpha * 100)}
            onChange={(e) => {
              const a = Number(e.target.value) / 100;
              const next = buildRgbaFromHex(fillForPicker, a);
              apply({ fill: next });
            }}
          />
        </label>
      )}

      {(kind === "shape" ||
        kind === "whiteout" ||
        kind === "annotate-line") && (
        <label className="flex items-center gap-1">
          <span className="text-muted">Width</span>
          <input
            type="number"
            min={0}
            max={48}
            className="w-14 rounded border border-ring bg-surface-3 px-1 py-1 text-text"
            value={Math.round(strokeWidth)}
            onChange={(e) => {
              const n = Number(e.target.value);
              if (!Number.isFinite(n)) return;
              apply({ strokeWidth: Math.max(0, n) });
            }}
          />
        </label>
      )}

      {kind === "whiteout" && (
        <label className="flex items-center gap-1">
          <span className="text-muted">Opacity</span>
          <input
            type="range"
            min={0}
            max={100}
            className="w-24"
            value={Math.round(objectOpacity * 100)}
            onChange={(e) => {
              const n = Number(e.target.value) / 100;
              apply({ opacity: Math.min(1, Math.max(0, n)) });
            }}
          />
        </label>
      )}
      <div className="h-4 w-px bg-border mx-1" />

      <button
        type="button"
        onClick={onDelete}
        className="flex h-8 w-8 items-center justify-center rounded border border-destructive/30 text-destructive hover:bg-destructive/10"
        title="Delete"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>,
    document.body,
  );
}
