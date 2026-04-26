import type { Canvas, FabricObject, IText } from "fabric";
import type { PageViewport } from "pdfjs-dist";
import type { PdfNativeTextRunState } from "../types/pdfNativeText";
import { usePdfEditorStore } from "../store/pdfEditorStore";
import { pdfBoundsToViewportRect } from "./pdfTextGeometry";

type ITextWithPdfData = IText & {
  data?: {
    pdfTextSource?: boolean;
    runId?: string;
    originalPdfBounds?: PdfNativeTextRunState["originalPdfBounds"];
  };
};

function isPdfSourceText(o: unknown): o is ITextWithPdfData {
  if (!o || typeof o !== "object") return false;
  const d = (o as FabricObject & { data?: { pdfTextSource?: boolean } }).data;
  return d?.pdfTextSource === true;
}

export function fabricITextToRunState(
  text: ITextWithPdfData,
  cw: number,
  ch: number,
): Omit<PdfNativeTextRunState, "runId" | "originalPdfBounds"> | null {
  const d = text.data;
  if (!d?.pdfTextSource || !d.runId || !d.originalPdfBounds) return null;
  const fill = typeof text.fill === "string" ? text.fill : "#111827";
  return {
    text: text.text ?? "",
    relLeft: (text.left ?? 0) / cw,
    relTop: (text.top ?? 0) / ch,
    relFontSize: (text.fontSize ?? 12) / ch,
    angle: text.angle ?? 0,
    scaleX: text.scaleX ?? 1,
    scaleY: text.scaleY ?? 1,
    fontFamily: String(text.fontFamily ?? "sans-serif"),
    fill,
    fontWeight: text.fontWeight ?? "normal",
    fontStyle: String(text.fontStyle ?? "normal"),
    direction: (text.direction as "ltr" | "rtl") || "ltr",
    textAlign: (text.textAlign as "left" | "right") || "left",
  };
}

export function upsertPdfNativeTextRun(
  pageNum: number,
  text: ITextWithPdfData,
  cw: number,
  ch: number,
): void {
  const d = text.data;
  if (!d?.pdfTextSource || !d.runId || !d.originalPdfBounds) return;
  const partial = fabricITextToRunState(text, cw, ch);
  if (!partial) return;
  usePdfEditorStore.getState().setPdfNativeTextRun(pageNum, d.runId, {
    runId: d.runId,
    originalPdfBounds: d.originalPdfBounds,
    ...partial,
  });
}

export function attachPdfNativeTextPersistence(
  canvas: Canvas,
  pageNum: number,
): () => void {
  const flushOne = (t: ITextWithPdfData) => {
    const cw = canvas.getWidth();
    const ch = canvas.getHeight();
    upsertPdfNativeTextRun(pageNum, t, cw, ch);
  };

  const onModified = (e: { target?: unknown }) => {
    const t = e.target;
    if (isPdfSourceText(t)) flushOne(t);
  };

  const subs: { obj: ITextWithPdfData; fn: () => void }[] = [];

  const attachObj = (o: ITextWithPdfData) => {
    const d = o.data;
    if (!d?.pdfTextSource) return;
    const fn = () => flushOne(o);
    o.on("changed", fn);
    o.on("editing:exited", fn);
    subs.push({ obj: o, fn });
  };

  for (const o of canvas.getObjects()) {
    if (isPdfSourceText(o)) attachObj(o);
  }

  canvas.on("object:modified", onModified);

  const onRemoved = (e: { target?: unknown }) => {
    const t = e.target;
    if (isPdfSourceText(t)) {
      const d = t.data;
      if (d?.runId) {
        usePdfEditorStore.getState().removePdfNativeTextRun(pageNum, d.runId);
        if (d.originalPdfBounds) {
          usePdfEditorStore
            .getState()
            .removeMaskedRegion(pageNum, d.originalPdfBounds);
        }
      }
    }
  };

  const onAdded = (e: { target?: unknown }) => {
    const t = e.target;
    if (isPdfSourceText(t)) {
      attachObj(t);
      flushOne(t);
    }
  };
  canvas.on("object:added", onAdded);
  canvas.on("object:removed", onRemoved);

  return () => {
    canvas.off("object:modified", onModified);
    canvas.off("object:added", onAdded);
    canvas.off("object:removed", onRemoved);
    for (const { obj, fn } of subs) {
      obj.off("changed", fn);
      obj.off("editing:exited", fn);
    }
  };
}

const MASK_PAD_PX = 2;

/** Paints white over original PDF text regions so the rasterized page does not show through. */
export function paintPdfTextMaskLayer(
  ctx: CanvasRenderingContext2D,
  fabricCanvas: Canvas,
  viewport: PageViewport,
  pageNum: number,
): void {
  const w = ctx.canvas.width;
  const h = ctx.canvas.height;
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = "#ffffff";

  for (const o of fabricCanvas.getObjects()) {
    const d = (o as ITextWithPdfData).data;
    if (!d?.pdfTextSource || !d.originalPdfBounds) continue;
    const r = pdfBoundsToViewportRect(d.originalPdfBounds, viewport);
    ctx.fillRect(
      r.left - MASK_PAD_PX,
      r.top - MASK_PAD_PX,
      r.width + 2 * MASK_PAD_PX,
      r.height + 2 * MASK_PAD_PX,
    );
  }

  const maskedRegions =
    usePdfEditorStore.getState().maskedRegions.get(pageNum) ?? [];
  for (const region of maskedRegions) {
    const r = pdfBoundsToViewportRect(region.bounds, viewport);
    ctx.fillStyle = region.fill;
    ctx.fillRect(
      r.left - MASK_PAD_PX,
      r.top - MASK_PAD_PX,
      r.width + 2 * MASK_PAD_PX,
      r.height + 2 * MASK_PAD_PX,
    );
  }
  ctx.restore();
}

export function applyPdfNativeTextOverridesToCanvas(
  pageNum: number,
  canvas: Canvas,
  cw: number,
  ch: number,
): void {
  const pageMap = usePdfEditorStore.getState().pdfNativeTextByPage.get(pageNum);
  if (!pageMap?.size) return;

  for (const o of canvas.getObjects()) {
    const d = (o as ITextWithPdfData).data;
    if (!d?.pdfTextSource || !d.runId) continue;
    const st = pageMap.get(d.runId);
    if (!st) continue;
    const t = o as ITextWithPdfData;
    t.set({
      text: st.text,
      left: st.relLeft * cw,
      top: st.relTop * ch,
      fontSize: st.relFontSize * ch,
      angle: st.angle,
      scaleX: st.scaleX,
      scaleY: st.scaleY,
      fontFamily: st.fontFamily,
      fill: st.fill,
      fontWeight: st.fontWeight,
      fontStyle: st.fontStyle,
      direction: st.direction as "ltr" | "rtl",
      textAlign: st.textAlign as "left" | "right" | "center" | "justify",
    });
    t.setCoords();
  }
  canvas.requestRenderAll();
}
