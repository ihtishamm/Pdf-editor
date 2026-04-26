import { Canvas, IText } from "fabric";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type DragEvent,
} from "react";
import type { RenderTask } from "pdfjs-dist";
import type { TextItem, TextMarkedContent } from "../types/pdfItems";
import {
  applyCanvasToolMode,
  attachFabricCanvasTools,
} from "../lib/fabricCanvasTools";
import {
  addFabricImageFromFile,
  pickImageFilesFromDataTransfer,
} from "../lib/insertFabricImage";
import {
  addFormFieldsToCanvas,
  createFabricFormField,
} from "../lib/fabricFormField";
import { attachFabricHistoryToCanvas } from "../lib/attachFabricHistoryToCanvas";
import { fabricHistoryRuntime } from "../lib/fabricHistoryRuntime";
import { markFabricHistoryUser } from "../lib/fabricHistoryHelpers";
import { addPdfLinksToCanvas, createFabricPdfLink } from "../lib/fabricPdfLink";
import { LinkPropertiesPopover } from "./LinkPropertiesPopover";
import {
  applyPageOverlayToCanvas,
  capturePageOverlay,
} from "../lib/pageOverlaySnapshot";
import {
  attachPdfNativeTextPersistence,
  applyPdfNativeTextOverridesToCanvas,
  paintPdfTextMaskLayer,
} from "../lib/pdfNativeTextPersistence";
import {
  isTextItem,
  pdfTextRunId,
  pdfTextItemToItextOptions,
} from "../lib/pdfTextToFabric";
import { getCachedPageData } from "../utils/pdfCache";
import { isRTL, getVisualOrder } from "../utils/bidiHelper";
import { extractColorForText } from "../utils/colorExtractor";
import { mapPdfFont } from "../utils/fontMapper";
import { pdfTextItemToPdfBounds } from "../lib/pdfTextGeometry";
import type { FormFieldType } from "../types/formFields";
import { usePdfEditorStore } from "../store/pdfEditorStore";

type PDFPageProps = {
  pageNum: number;
  containerWidth: number;
  onInView: (num: number) => void;
  onSelectionIText: (t: IText | null) => void;
};

export function PDFPage({
  pageNum,
  containerWidth,
  onInView,
  onSelectionIText,
}: PDFPageProps) {
  const pdf = usePdfEditorStore((s) => s.pdf);
  const zoomLevel = usePdfEditorStore((s) => s.zoomLevel);
  const activeTool = usePdfEditorStore((s) => s.activeTool);
  const annotateVariant = usePdfEditorStore((s) => s.annotateVariant);
  const registerFabric = usePdfEditorStore((s) => s.registerFabric);
  const unregisterFabricPage = usePdfEditorStore((s) => s.unregisterFabricPage);
  const pendingImageInsert = usePdfEditorStore((s) => s.pendingImageInsert);
  const clearPendingImageInsert = usePdfEditorStore(
    (s) => s.clearPendingImageInsert,
  );
  const enqueueImageInsert = usePdfEditorStore((s) => s.enqueueImageInsert);
  const setActiveTool = usePdfEditorStore((s) => s.setActiveTool);
  const currentPage = usePdfEditorStore((s) => s.currentPage);
  const pendingSignature = usePdfEditorStore((s) => s.pendingSignature);
  const clearPendingSignatureDataUrl = usePdfEditorStore(
    (s) => s.clearPendingSignatureDataUrl,
  );

  const pdfCanvasRef = useRef<HTMLCanvasElement>(null);
  const maskCanvasRef = useRef<HTMLCanvasElement>(null);
  const fabricHostRef = useRef<HTMLDivElement>(null);
  const fabricInstanceRef = useRef<Canvas | null>(null);
  const pageRef = useRef<HTMLDivElement>(null);

  const [overlayCanvas, setOverlayCanvas] = useState<Canvas | null>(null);

  // Intersection Observer to detect current page
  useEffect(() => {
    const el = pageRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          onInView(pageNum);
        }
      },
      { threshold: 0.5 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [pageNum, onInView]);

  useEffect(() => {
    if (!pdf || containerWidth <= 0) return;

    const pdfCanvas = pdfCanvasRef.current;
    const maskCanvas = maskCanvasRef.current;
    const fabricHostEl = fabricHostRef.current;
    if (!pdfCanvas || !maskCanvas || !fabricHostEl) return;

    const ac = new AbortController();
    const { signal } = ac;
    let renderTask: RenderTask | null = null;
    let detachFabricTools: (() => void) | null = null;
    let detachFabricHistory: (() => void) | null = null;
    let detachPdfNativePersistence: (() => void) | null = null;

    void (async () => {
      // Capture final snapshot on unmount
      if (fabricInstanceRef.current) {
        const snap = capturePageOverlay(fabricInstanceRef.current);
        usePdfEditorStore.getState().savePageOverlaySnapshot(pageNum, snap);
      }

      const page = await pdf.getPage(pageNum);
      if (signal.aborted) return;

      const base = page.getViewport({ scale: 1 });
      const fitScale = (containerWidth - 32) / base.width;
      const scale = fitScale * zoomLevel;
      const viewport = page.getViewport({ scale });

      const w = Math.floor(viewport.width);
      const h = Math.floor(viewport.height);

      pdfCanvas.width = w;
      pdfCanvas.height = h;
      maskCanvas.width = w;
      maskCanvas.height = h;

      // Ensure a white background before PDF.js settles in (fixes "black page" 이슈s)
      const ctx = pdfCanvas.getContext("2d");
      if (ctx) {
        ctx.fillStyle = "white";
        ctx.fillRect(0, 0, w, h);
      }

      renderTask = page.render({
        canvas: pdfCanvas,
        viewport,
      });

      try {
        await renderTask.promise;
      } catch {
        /* RenderingCancelledException */
      }
      if (signal.aborted) return;

      // Lazy extraction removed from here

      fabricHostEl.replaceChildren();
      const fabricEl = document.createElement("canvas");
      fabricHostEl.appendChild(fabricEl);

      const fabricCanvas = new Canvas(fabricEl, {
        width: w,
        height: h,
        selection: true,
        enablePointerEvents: true,
        backgroundColor: "transparent",
        enableRetinaScaling: false,
        preserveObjectStacking: true,
        uniformScaling: true,
        uniScaleKey: "shiftKey",
      });
      fabricInstanceRef.current = fabricCanvas;

      fabricCanvas.on("mouse:dblclick", async (opt) => {
        const s = usePdfEditorStore.getState();
        const tool = s.activeTool;
        if (tool !== "select" && tool !== "text") return;
        if (opt.target) return;

        const { x, y } = fabricCanvas.getScenePoint(opt.e);
        const { textContent, operatorList } = await getCachedPageData(
          page,
          pageNum,
        );

        const [pdfX, pdfY] = viewport.convertToPdfPoint(x, y);

        const item = textContent.items.find(
          (it: TextItem | TextMarkedContent) => {
            if (!isTextItem(it)) return false;
            const bounds = pdfTextItemToPdfBounds(it);
            // Pad hit-test slightly
            return (
              pdfX >= bounds.minX - 1 &&
              pdfX <= bounds.maxX + 1 &&
              pdfY >= bounds.minY - 1 &&
              pdfY <= bounds.maxY + 1
            );
          },
        );

        if (item && isTextItem(item)) {
          const color = extractColorForText(operatorList, item.str);
          const fontInfo = mapPdfFont(item.fontName);
          const isRtl = isRTL(item.str);
          const visualText = getVisualOrder(item.str);

          const originalPdfBounds = pdfTextItemToPdfBounds(item);

          // Sample background color from the PDF canvas
          let sampledFill = "#ffffff";
          const ctx = pdfCanvasRef.current?.getContext("2d");
          if (ctx) {
            const pix = ctx.getImageData(x, y, 1, 1).data;
            sampledFill = `rgb(${pix[0]}, ${pix[1]}, ${pix[2]})`;
          }

          s.addMaskedRegion(pageNum, originalPdfBounds, sampledFill);

          const opts = pdfTextItemToItextOptions(
            item,
            viewport,
            textContent.styles,
          );

          const text = new IText(visualText, {
            ...opts,
            fill: color,
            fontFamily: fontInfo.family,
            fontWeight: fontInfo.weight as IText["fontWeight"],
            fontStyle: fontInfo.style as IText["fontStyle"],
            direction: isRtl ? "rtl" : "ltr",
            textAlign: isRtl ? "right" : "left",
            data: {
              pdfTextSource: true as const,
              runId: pdfTextRunId(pageNum, Date.now()),
              originalPdfBounds,
            },
          });

          fabricCanvas.add(text);
          fabricCanvas.setActiveObject(text);
          text.enterEditing();
          fabricCanvas.requestRenderAll();
        } else if (textContent.items.length === 0) {
          s.showToast(
            "This region contains scanned content and cannot be edited as text",
          );
        }
      });

      if (signal.aborted) {
        await fabricCanvas.dispose();
        return;
      }

      fabricHistoryRuntime.runSuppressed(() => {
        // addPdfTextItemsToCanvas removed (using lazy extraction)
        applyPdfNativeTextOverridesToCanvas(pageNum, fabricCanvas, w, h);
        addFormFieldsToCanvas(
          fabricCanvas,
          usePdfEditorStore.getState().formFields,
          pageNum,
          w,
          h,
        );
        addPdfLinksToCanvas(
          fabricCanvas,
          usePdfEditorStore.getState().pdfLinks,
          pageNum,
          w,
          h,
          usePdfEditorStore.getState().activeTool === "links",
        );
      });

      if (signal.aborted) {
        await fabricCanvas.dispose();
        return;
      }

      // Restore snapshot
      const snapshot = usePdfEditorStore
        .getState()
        .pageOverlaySnapshots.get(pageNum);
      if (snapshot) {
        await applyPageOverlayToCanvas(fabricCanvas, snapshot);
      }

      if (signal.aborted) {
        await fabricCanvas.dispose();
        return;
      }

      const store = usePdfEditorStore.getState;

      registerFabric(pageNum, fabricCanvas);

      const historyApi = attachFabricHistoryToCanvas(
        fabricCanvas,
        () => pageNum,
        (partial) => store().addHistory(partial),
      );
      detachFabricHistory = historyApi.dispose;

      const maskCtx = maskCanvas.getContext("2d");
      if (maskCtx) {
        paintPdfTextMaskLayer(maskCtx, fabricCanvas, viewport, pageNum);
      }

      detachPdfNativePersistence = attachPdfNativeTextPersistence(
        fabricCanvas,
        pageNum,
      );

      detachFabricTools = attachFabricCanvasTools(
        fabricCanvas,
        {
          getActiveTool: () => store().activeTool,
          getShapeVariant: () => store().shapeVariant,
          getAnnotateVariant: () => store().annotateVariant,
          getFormFieldVariant: () => store().formFieldVariant,
          getCurrentPage: () => pageNum,
        },
        {
          addCommentAt: (p, sx, sy) => store().addCommentAt(p, sx, sy),
          onSelectionIText: (t) => {
            onSelectionIText(t);
          },
          onSelectionFormField: (id) => store().setSelectedFormFieldId(id),
          onFormFieldBox: (args) => {
            const s = store();
            const position = {
              x: args.left / args.canvasW,
              y: args.top / args.canvasH,
            };
            const size = {
              w: args.width / args.canvasW,
              h: args.height / args.canvasH,
            };
            const t = args.variant as FormFieldType;
            const meta = s.addFormField({
              page: args.page,
              type: t,
              name: "",
              position,
              size,
              options: t === "dropdown" ? ["Option 1", "Option 2"] : [],
              required: false,
              placeholder: "",
              radioGroupName: "",
              radioOptionId: "",
              buttonLabel: t === "button" ? "Button" : "",
              borderColor: "#dc2626",
              textColor: "#9ca3af",
              fontSize: 14,
            });
            const g = createFabricFormField(
              meta,
              fabricCanvas.getWidth(),
              fabricCanvas.getHeight(),
            );
            markFabricHistoryUser(g, "form", "Form field");
            g.set({
              selectable: true,
              evented: true,
              hasControls: true,
              hasBorders: true,
            });
            g.setCoords();
            fabricCanvas.add(g);
            fabricCanvas.bringObjectToFront(g);
            fabricCanvas.setActiveObject(g);
            fabricCanvas.requestRenderAll();
            s.setSelectedFormFieldId(meta.id);
            s.setActiveTool("select");
          },
          onFormFieldGeometryCommit: (fieldId, position, size) => {
            store().updateFormField(fieldId, { position, size });
          },
          onLinkBoxDrawn: (args) => {
            const s = store();
            const position = {
              x: args.left / args.canvasW,
              y: args.top / args.canvasH,
            };
            const size = {
              w: args.width / args.canvasW,
              h: args.height / args.canvasH,
            };
            const entry = s.addPdfLink({
              page: args.page,
              position,
              size,
            });
            const cw0 = fabricCanvas.getWidth();
            const ch0 = fabricCanvas.getHeight();
            const linkRect = createFabricPdfLink(
              entry,
              cw0,
              ch0,
              s.activeTool === "links",
            );
            fabricCanvas.add(linkRect);
            fabricCanvas.bringObjectToFront(linkRect);
            fabricCanvas.setActiveObject(linkRect);
            s.setSelectedPdfLinkId(entry.id);
            fabricCanvas.requestRenderAll();
          },
          onLinkClicked: (id) => {
            store().setSelectedPdfLinkId(id);
          },
          onPdfLinkGeometryCommit: () => {
            // Geometry updated in store
          },
          onManualHistoryAdd: (o) => historyApi.manualRecordAdd(o),
        },
      );

      applyCanvasToolMode(
        fabricCanvas,
        store().activeTool,
        store().annotateVariant,
      );

      setOverlayCanvas(fabricCanvas);
    })();

    return () => {
      ac.abort();

      const inst = fabricInstanceRef.current;

      if (detachFabricHistory) detachFabricHistory();
      if (detachPdfNativePersistence) detachPdfNativePersistence();
      if (detachFabricTools) detachFabricTools();

      if (inst) {
        const snap = capturePageOverlay(inst);
        usePdfEditorStore
          .getState()
          .savePageOverlaySnapshot(
            pageNum,
            snap.objects.length > 0 ? snap : null,
          );
      }

      fabricInstanceRef.current = null;
      fabricHostEl.replaceChildren();
      unregisterFabricPage(pageNum);

      void (async () => {
        if (inst) await inst.dispose();
      })();
    };
  }, [
    pdf,
    pageNum,
    zoomLevel,
    containerWidth,
    onInView,
    onSelectionIText,
    registerFabric,
    unregisterFabricPage,
  ]);

  // Sync tool mode
  useEffect(() => {
    if (!overlayCanvas) return;
    applyCanvasToolMode(overlayCanvas, activeTool, annotateVariant);
  }, [overlayCanvas, activeTool, annotateVariant]);

  // Clear selection if this page is no longer the "current" one?
  // Actually, Fabric handles its own selection per canvas.
  // But we might want to discard selection on other canvases when one is clicked.
  useEffect(() => {
    if (currentPage !== pageNum && overlayCanvas) {
      overlayCanvas.discardActiveObject();
      overlayCanvas.requestRenderAll();
    }
  }, [currentPage, pageNum, overlayCanvas]);

  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    if (!pickImageFilesFromDataTransfer(e.dataTransfer).length) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  }, []);

  const handleDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      const files = pickImageFilesFromDataTransfer(e.dataTransfer);
      if (!files.length) return;
      e.preventDefault();
      e.stopPropagation();
      const c = fabricInstanceRef.current;
      if (!c) {
        enqueueImageInsert(files[0]!);
        setActiveTool("select");
        return;
      }
      void (async () => {
        for (const f of files) {
          try {
            await addFabricImageFromFile(c, f);
          } catch (err) {
            console.error("[PDFPage] drop image failed", err);
          }
        }
        setActiveTool("select");
      })();
    },
    [enqueueImageInsert, setActiveTool],
  );

  useEffect(() => {
    if (currentPage === pageNum && pendingImageInsert && overlayCanvas) {
      const file = pendingImageInsert;
      clearPendingImageInsert();
      void (async () => {
        try {
          await addFabricImageFromFile(overlayCanvas, file);
          setActiveTool("select");
        } catch (err) {
          console.error("[PDFPage] image insert failed", err);
        }
      })();
    }
  }, [
    currentPage,
    pageNum,
    pendingImageInsert,
    overlayCanvas,
    clearPendingImageInsert,
    setActiveTool,
  ]);

  useEffect(() => {
    if (currentPage === pageNum && pendingSignature && overlayCanvas) {
      const { dataUrl } = pendingSignature;
      clearPendingSignatureDataUrl();
      void (async () => {
        try {
          const { addFabricImageFromDataUrl } =
            await import("../lib/insertFabricImage");
          await addFabricImageFromDataUrl(overlayCanvas, dataUrl, "Signature");
          setActiveTool("select");
        } catch (err) {
          console.error("[PDFPage] signature insert failed", err);
        }
      })();
    }
  }, [
    currentPage,
    pageNum,
    pendingSignature,
    overlayCanvas,
    clearPendingSignatureDataUrl,
    setActiveTool,
  ]);

  return (
    <div
      ref={pageRef}
      className={`relative mx-auto mb-8 flex flex-col items-center transition-opacity duration-300 ${
        pdf ? "opacity-100" : "opacity-0"
      }`}
    >
      <div className="absolute -left-12 top-0 flex h-full flex-col items-center justify-start gap-4 pt-4">
        <div className="rounded-md bg-surface-alt px-2 py-1 text-[11px] font-bold text-muted shadow-sm">
          {pageNum}
        </div>
      </div>

      <div
        className="relative bg-white shadow-[0_8px_32px_rgba(0,0,0,0.15)] ring-1 ring-border"
        onDragEnter={handleDragOver}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={() => {
          if (currentPage !== pageNum) onInView(pageNum);
        }}
      >
        <canvas
          ref={pdfCanvasRef}
          className="relative z-10 block bg-white"
          aria-hidden
        />
        <canvas
          ref={maskCanvasRef}
          className="pointer-events-none absolute inset-0 z-[15] block"
          aria-hidden
        />
        <div
          ref={fabricHostRef}
          className="absolute inset-0 z-20"
          aria-hidden
        />
        <LinkPropertiesPopover canvas={overlayCanvas} activeTool={activeTool} />
      </div>
    </div>
  );
}
