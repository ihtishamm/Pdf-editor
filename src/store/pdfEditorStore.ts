import { Canvas } from "fabric";
import { getDocument, type PDFDocumentProxy } from "pdfjs-dist";
import { create } from "zustand";
import { fabricHistoryRuntime } from "../lib/fabricHistoryRuntime";
import { revertHistoryEntries } from "../lib/fabricHistoryRevert";
import type { FormFieldMeta } from "../types/formFields";
import type { PdfLinkEntry } from "../types/pdfLinks";
import type {
  PendingSignatureInsert,
  SavedSignature,
} from "../types/signatures";
import type { HistoryEntry } from "../types/fabricHistory";
import type {
  AnnotateVariant,
  CommentEntry,
  EditorTool,
  FormFieldVariant,
  ShapeVariant,
} from "../types/editorTools";
import type { PageOverlaySnapshot } from "../lib/pageOverlaySnapshot";
import type { PdfNativeTextRunState } from "../types/pdfNativeText";

const MIN_ZOOM = 0.5;
const MAX_HISTORY_ENTRIES = 50;
const MAX_ZOOM = 1.0;
const ZOOM_STEP = 0.1;

export type {
  AnnotateVariant,
  CommentEntry,
  EditorTool,
  FormFieldVariant,
  ShapeVariant,
};

export type EditorMainView = "editor" | "ready";
export type Theme = "light" | "dark";

export type PdfEditorState = {
  pdf: PDFDocumentProxy | null;
  /** Original bytes for pdf-lib export (parallel to PDF.js proxy). */
  pdfSourceBytes: Uint8Array | null;
  pdfFileName: string;
  currentPage: number;
  totalPages: number;
  zoomLevel: number;
  activeTool: EditorTool;
  shapeVariant: ShapeVariant;
  annotateVariant: AnnotateVariant;
  formFieldVariant: FormFieldVariant;
  formFields: FormFieldMeta[];
  selectedFormFieldId: string | null;
  /** Hyperlink regions (normalized geometry); Fabric rects reference `data.linkId`. */
  pdfLinks: PdfLinkEntry[];
  comments: CommentEntry[];
  /** Comment id open in sidebar (new or existing). */
  activeCommentId: string | null;
  commentPanelOpen: boolean;
  fabricByPage: Map<number, Canvas>;
  /**
   * User-drawn Fabric overlay per page (shapes, stamps, etc.) captured when leaving the page.
   * Live canvas in `fabricByPage` wins at export; this backs non-visible pages.
   */
  pageOverlaySnapshots: Map<number, PageOverlaySnapshot>;
  /**
   * Extracted PDF text runs edited in Fabric, keyed by 1-based page then runId.
   * Survives canvas rebuild (zoom) and is used when exporting pages without a live Fabric instance.
   */
  pdfNativeTextByPage: Map<number, Map<string, PdfNativeTextRunState>>;
  /** Picked up by PDFViewer to insert on the current page’s Fabric canvas. */
  pendingImageInsert: File | null;
  /** Insert Fabric image from Sign modal (centered, or at last cursor position on overlay). */
  pendingSignature: PendingSignatureInsert | null;
  savedSignatures: SavedSignature[];
  /** Newest first; global across PDF pages. */
  history: HistoryEntry[];
  /** Object URL for last successful export (revoke when replacing or clearing). */
  exportedBlobUrl: string | null;
  exportedBytes: Uint8Array | null;
  exportedFilename: string;
  isExporting: boolean;
  currentView: EditorMainView;
  toastMessage: string | null;
  theme: Theme;
};

export type PdfEditorActions = {
  loadPdfFromBytes: (
    data: Uint8Array,
    fileName: string,
    options?: { keepState?: boolean },
  ) => Promise<void>;
  loadBlankA4: () => Promise<void>;
  loadFile: (file: File) => Promise<void>;
  setPage: (page: number) => void;
  setZoomLevel: (level: number) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  setActiveTool: (tool: EditorTool) => void;
  setShapeVariant: (v: ShapeVariant) => void;
  setAnnotateVariant: (v: AnnotateVariant) => void;
  setFormFieldVariant: (v: FormFieldVariant) => void;
  addFormField: (meta: Omit<FormFieldMeta, "id">) => FormFieldMeta;
  updateFormField: (id: string, patch: Partial<FormFieldMeta>) => void;
  removeFormField: (id: string) => void;
  setSelectedFormFieldId: (id: string | null) => void;
  addPdfLink: (
    entry: Omit<PdfLinkEntry, "id" | "linkType" | "value"> & {
      linkType?: PdfLinkEntry["linkType"];
      value?: string;
    },
  ) => PdfLinkEntry;
  updatePdfLink: (
    id: string,
    patch: Partial<
      Pick<PdfLinkEntry, "linkType" | "value" | "position" | "size">
    >,
  ) => void;
  removePdfLink: (id: string) => void;
  addCommentAt: (page: number, sceneX: number, sceneY: number) => string;
  updateCommentBody: (id: string, body: string) => void;
  removeComment: (id: string) => void;
  setActiveCommentId: (id: string | null) => void;
  setCommentPanelOpen: (open: boolean) => void;
  registerFabric: (page: number, canvas: Canvas) => Promise<void>;
  /** Replace or remove persisted overlay for a page (omit snapshot when canvas had no overlay objects). */
  savePageOverlaySnapshot: (
    page: number,
    snapshot: PageOverlaySnapshot | null,
  ) => void;
  setPdfNativeTextRun: (
    page: number,
    runId: string,
    state: PdfNativeTextRunState,
  ) => void;
  disposeFabric: (page: number) => Promise<void>;
  unregisterFabricPage: (page: number) => void;
  disposeAllFabric: () => Promise<void>;
  reset: () => Promise<void>;
  enqueueImageInsert: (file: File) => void;
  clearPendingImageInsert: () => void;
  enqueueSignatureDataUrl: (dataUrl: string, placeAtCursor?: boolean) => void;
  clearPendingSignatureDataUrl: () => void;
  addSavedSignature: (dataUrl: string) => SavedSignature;
  removeSavedSignature: (id: string) => void;
  addHistory: (
    entry: Omit<HistoryEntry, "id" | "timestamp"> & {
      id?: string;
      timestamp?: Date;
    },
  ) => void;
  revertEntries: (entryIds: string[]) => Promise<void>;
  undoLast: () => void;
  setCurrentView: (view: EditorMainView) => void;
  setExportResult: (url: string, bytes: Uint8Array, filename: string) => void;
  clearExportResult: () => void;
  setIsExporting: (v: boolean) => void;
  showToast: (message: string) => void;
  dismissToast: () => void;
  insertPage: (afterPage: number) => Promise<void>;
  deletePage: (page: number) => Promise<void>;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
};

function clampZoom(z: number): number {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z));
}

function newCommentId(): string {
  return `c-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function newFormFieldId(): string {
  return `ff-${crypto.randomUUID()}`;
}

function newPdfLinkId(): string {
  return `lnk-${crypto.randomUUID()}`;
}

function newSavedSignatureId(): string {
  return `sig-${crypto.randomUUID()}`;
}

function slugPdfName(prefix: string): string {
  const s = `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
  return s.replace(/[^a-zA-Z0-9._-]/g, "_");
}

function revokeIfUrl(url: string | null): void {
  if (url) {
    try {
      URL.revokeObjectURL(url);
    } catch {
      /* ignore */
    }
  }
}

async function disposeAllFabricFromMap(
  map: Map<number, Canvas>,
): Promise<void> {
  for (const c of map.values()) {
    await c.dispose();
  }
}

export const usePdfEditorStore = create<PdfEditorState & PdfEditorActions>(
  (set, get) => ({
    pdf: null,
    pdfSourceBytes: null,
    pdfFileName: "",
    currentPage: 1,
    totalPages: 0,
    zoomLevel: 1,
    activeTool: "select",
    shapeVariant: "rectangle",
    annotateVariant: "highlight",
    formFieldVariant: "text",
    formFields: [],
    selectedFormFieldId: null,
    pdfLinks: [],
    comments: [],
    activeCommentId: null,
    commentPanelOpen: false,
    fabricByPage: new Map(),
    pageOverlaySnapshots: new Map(),
    pdfNativeTextByPage: new Map(),
    pendingImageInsert: null,
    pendingSignature: null,
    savedSignatures: [],
    history: [],
    exportedBlobUrl: null,
    exportedBytes: null,
    exportedFilename: "",
    isExporting: false,
    currentView: "editor",
    toastMessage: null,
    theme: "light",

    loadPdfFromBytes: async (data, fileName, options = {}) => {
      const prev = get().pdf;
      const fabrics = get().fabricByPage;
      await disposeAllFabricFromMap(fabrics);
      if (prev) {
        await prev.destroy();
      }

      const bytesForPdfJs = new Uint8Array(data);
      const bytesForPdfLib = new Uint8Array(data);
      const loadingTask = getDocument({ data: bytesForPdfJs });
      const pdf = await loadingTask.promise;
      const prevUrl = get().exportedBlobUrl;
      revokeIfUrl(prevUrl);

      const stateUpdate: Partial<PdfEditorState> = {
        pdf,
        pdfSourceBytes: bytesForPdfLib,
        pdfFileName: fileName,
        totalPages: pdf.numPages,
        currentPage:
          get().currentPage > pdf.numPages ? pdf.numPages : get().currentPage,
        fabricByPage: new Map(),
        zoomLevel: get().zoomLevel || 1,
        activeTool: "select",
        exportedBlobUrl: null,
        exportedBytes: null,
        exportedFilename: "",
        currentView: "editor",
        isExporting: false,
      };

      if (!options.keepState) {
        Object.assign(stateUpdate, {
          pageOverlaySnapshots: new Map(),
          pdfNativeTextByPage: new Map(),
          formFields: [],
          selectedFormFieldId: null,
          pdfLinks: [],
          comments: [],
          activeCommentId: null,
          commentPanelOpen: false,
          pendingImageInsert: null,
          pendingSignature: null,
          history: [],
        });
      }

      set(stateUpdate);
    },

    loadBlankA4: async () => {
      const { PDFDocument, PageSizes } = await import("pdf-lib");
      const doc = await PDFDocument.create();
      doc.addPage(PageSizes.A4);
      const bytes = await doc.save();
      await get().loadPdfFromBytes(bytes, "Blank document.pdf");
    },

    loadFile: async (file) => {
      const buf = new Uint8Array(await file.arrayBuffer());
      await get().loadPdfFromBytes(buf, file.name);
    },

    setPage: (page) => {
      const { totalPages } = get();
      if (totalPages < 1) return;
      const next = Math.min(totalPages, Math.max(1, Math.floor(page)));
      set({ currentPage: next });
    },

    setZoomLevel: (level) => set({ zoomLevel: clampZoom(level) }),

    zoomIn: () =>
      set((s) => ({ zoomLevel: clampZoom(s.zoomLevel + ZOOM_STEP) })),

    zoomOut: () =>
      set((s) => ({ zoomLevel: clampZoom(s.zoomLevel - ZOOM_STEP) })),

    setActiveTool: (tool) => set({ activeTool: tool }),

    setShapeVariant: (v) => set({ shapeVariant: v }),

    setAnnotateVariant: (v) => set({ annotateVariant: v }),

    setFormFieldVariant: (v) => set({ formFieldVariant: v }),

    addFormField: (partial) => {
      const id = newFormFieldId();
      const type = partial.type;
      const uniqueName = slugPdfName(type);
      const entry: FormFieldMeta = {
        id,
        page: partial.page,
        type,
        name: partial.name || uniqueName,
        position: { ...partial.position },
        size: { ...partial.size },
        options:
          type === "dropdown"
            ? partial.options?.length
              ? [...partial.options]
              : ["Option 1", "Option 2"]
            : partial.options?.length
              ? [...partial.options]
              : [],
        required: partial.required ?? false,
        placeholder:
          partial.placeholder ??
          (type === "text" || type === "dropdown" ? "Sample text" : ""),
        radioGroupName:
          partial.radioGroupName?.trim() || `group_${id.slice(3, 11)}`,
        radioOptionId: partial.radioOptionId?.trim() || slugPdfName("opt"),
        buttonLabel: partial.buttonLabel ?? (type === "button" ? "Button" : ""),
        borderColor: partial.borderColor ?? "#dc2626",
        textColor: partial.textColor ?? "#9ca3af",
        fontSize: partial.fontSize ?? 14,
      };
      set((s) => ({ formFields: [...s.formFields, entry] }));
      return entry;
    },

    updateFormField: (id, patch) => {
      set((s) => ({
        formFields: s.formFields.map((f) => {
          if (f.id !== id) return f;
          const next: FormFieldMeta = { ...f, ...patch };
          if (patch.position)
            next.position = { ...f.position, ...patch.position };
          if (patch.size) next.size = { ...f.size, ...patch.size };
          if (patch.options) next.options = [...patch.options];
          return next;
        }),
      }));
    },

    removeFormField: (id) => {
      set((s) => ({
        formFields: s.formFields.filter((f) => f.id !== id),
        selectedFormFieldId:
          s.selectedFormFieldId === id ? null : s.selectedFormFieldId,
      }));
    },

    setSelectedFormFieldId: (id) => set({ selectedFormFieldId: id }),

    addPdfLink: (partial) => {
      const id = newPdfLinkId();
      const entry: PdfLinkEntry = {
        id,
        page: partial.page,
        position: { ...partial.position },
        size: { ...partial.size },
        linkType: partial.linkType ?? "url",
        value: partial.value ?? "",
      };
      set((s) => ({ pdfLinks: [...s.pdfLinks, entry] }));
      return entry;
    },

    updatePdfLink: (id, patch) => {
      set((s) => ({
        pdfLinks: s.pdfLinks.map((l) => {
          if (l.id !== id) return l;
          const next = { ...l, ...patch };
          if (patch.position)
            next.position = { ...l.position, ...patch.position };
          if (patch.size) next.size = { ...l.size, ...patch.size };
          return next;
        }),
      }));
    },

    removePdfLink: (id) => {
      set((s) => ({
        pdfLinks: s.pdfLinks.filter((l) => l.id !== id),
      }));
    },

    addCommentAt: (page, sceneX, sceneY) => {
      const id = newCommentId();
      const entry: CommentEntry = {
        id,
        page,
        sceneX,
        sceneY,
        body: "",
      };
      set((s) => ({
        comments: [...s.comments, entry],
        activeCommentId: id,
        commentPanelOpen: true,
      }));
      return id;
    },

    updateCommentBody: (id, body) => {
      set((s) => ({
        comments: s.comments.map((c) => (c.id === id ? { ...c, body } : c)),
      }));
    },

    removeComment: (id) => {
      set((s) => ({
        comments: s.comments.filter((c) => c.id !== id),
        activeCommentId: s.activeCommentId === id ? null : s.activeCommentId,
      }));
    },

    setActiveCommentId: (id) => set({ activeCommentId: id }),

    setCommentPanelOpen: (open) => set({ commentPanelOpen: open }),

    registerFabric: async (page, canvas) => {
      const prev = get().fabricByPage.get(page);
      if (prev && prev !== canvas) {
        await prev.dispose();
      }
      set((state) => {
        const next = new Map(state.fabricByPage);
        next.set(page, canvas);
        return { fabricByPage: next };
      });
    },

    savePageOverlaySnapshot: (page, snapshot) => {
      set((state) => {
        const next = new Map(state.pageOverlaySnapshots);
        if (!snapshot || snapshot.objects.length === 0) {
          next.delete(page);
        } else {
          next.set(page, {
            width: snapshot.width,
            height: snapshot.height,
            objects: snapshot.objects.map((o) => ({ ...o })),
          });
        }
        return { pageOverlaySnapshots: next };
      });
    },

    setPdfNativeTextRun: (page, runId, state) => {
      set((s) => {
        const outer = new Map(s.pdfNativeTextByPage);
        const prevInner =
          outer.get(page) ?? new Map<string, PdfNativeTextRunState>();
        const inner = new Map(prevInner);
        inner.set(runId, { ...state });
        outer.set(page, inner);
        return { pdfNativeTextByPage: outer };
      });
    },

    disposeFabric: async (page) => {
      const c = get().fabricByPage.get(page);
      if (c) {
        await c.dispose();
      }
      set((state) => {
        const next = new Map(state.fabricByPage);
        next.delete(page);
        return { fabricByPage: next };
      });
    },

    unregisterFabricPage: (page) => {
      set((state) => {
        const next = new Map(state.fabricByPage);
        next.delete(page);
        return { fabricByPage: next };
      });
    },

    disposeAllFabric: async () => {
      const map = get().fabricByPage;
      await disposeAllFabricFromMap(map);
      set({ fabricByPage: new Map() });
    },

    enqueueImageInsert: (file) => set({ pendingImageInsert: file }),

    clearPendingImageInsert: () => set({ pendingImageInsert: null }),

    enqueueSignatureDataUrl: (dataUrl, placeAtCursor = false) =>
      set({ pendingSignature: { dataUrl, placeAtCursor } }),

    clearPendingSignatureDataUrl: () => set({ pendingSignature: null }),

    addSavedSignature: (dataUrl) => {
      const entry: SavedSignature = {
        id: newSavedSignatureId(),
        dataUrl,
        createdAt: Date.now(),
      };
      set((s) => ({ savedSignatures: [...s.savedSignatures, entry] }));
      return entry;
    },

    removeSavedSignature: (id) => {
      set((s) => ({
        savedSignatures: s.savedSignatures.filter((x) => x.id !== id),
      }));
    },

    addHistory: (partial) => {
      const id = partial.id ?? crypto.randomUUID();
      const entry: HistoryEntry = {
        ...partial,
        id,
        timestamp: partial.timestamp ?? new Date(),
      };
      set((s) => ({
        history: [entry, ...s.history].slice(0, MAX_HISTORY_ENTRIES),
      }));
    },

    revertEntries: async (entryIds) => {
      const idSet = new Set(entryIds);
      const { fabricByPage, history } = get();
      const toRevert = history
        .filter((e) => idSet.has(e.id))
        .sort((a, b) => history.indexOf(a) - history.indexOf(b));
      await fabricHistoryRuntime.runSuppressedAsync(() =>
        revertHistoryEntries(toRevert, fabricByPage),
      );
      set((s) => ({
        history: s.history.filter((e) => !idSet.has(e.id)),
      }));
    },

    undoLast: () => {
      const h = get().history;
      const first = h[0];
      if (!first) return;
      void get().revertEntries([first.id]);
    },

    setCurrentView: (view) => set({ currentView: view }),

    setExportResult: (url, bytes, filename) => {
      const prev = get().exportedBlobUrl;
      revokeIfUrl(prev);
      set({
        exportedBlobUrl: url,
        exportedBytes: new Uint8Array(bytes),
        exportedFilename: filename,
      });
    },

    clearExportResult: () => {
      const prev = get().exportedBlobUrl;
      revokeIfUrl(prev);
      set({
        exportedBlobUrl: null,
        exportedBytes: null,
        exportedFilename: "",
      });
    },

    setIsExporting: (v) => set({ isExporting: v }),

    showToast: (message) => {
      set({ toastMessage: message });
      const t = message;
      setTimeout(() => {
        if (get().toastMessage === t) {
          set({ toastMessage: null });
        }
      }, 4200);
    },

    dismissToast: () => set({ toastMessage: null }),

    toggleTheme: () => {
      const next = get().theme === "light" ? "dark" : "light";
      set({ theme: next });
      if (next === "dark") {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    },

    insertPage: async (afterPage) => {
      const { pdfSourceBytes } = get();
      if (!pdfSourceBytes) return;

      const { PDFDocument, PageSizes } = await import("pdf-lib");
      const doc = await PDFDocument.load(pdfSourceBytes);
      doc.insertPage(afterPage, PageSizes.A4);
      const newBytes = await doc.save();

      const shift = (p: number) => (p > afterPage ? p + 1 : p);

      set((s) => ({
        formFields: s.formFields.map((f) => ({ ...f, page: shift(f.page) })),
        pdfLinks: s.pdfLinks.map((l) => ({ ...l, page: shift(l.page) })),
        comments: s.comments.map((c) => ({ ...c, page: shift(c.page) })),
        pageOverlaySnapshots: new Map(
          Array.from(s.pageOverlaySnapshots.entries()).map(([p, sn]) => [
            shift(p),
            sn,
          ]),
        ),
        pdfNativeTextByPage: new Map(
          Array.from(s.pdfNativeTextByPage.entries()).map(([p, d]) => [
            shift(p),
            d,
          ]),
        ),
      }));

      await get().loadPdfFromBytes(newBytes, get().pdfFileName, {
        keepState: true,
      });
    },

    deletePage: async (pageNum) => {
      const { pdfSourceBytes, totalPages } = get();
      if (!pdfSourceBytes || totalPages <= 1) return;

      const { PDFDocument } = await import("pdf-lib");
      const doc = await PDFDocument.load(pdfSourceBytes);
      doc.removePage(pageNum - 1);
      const newBytes = await doc.save();

      const shift = (p: number) => (p > pageNum ? p - 1 : p);
      const keep = (p: number) => p !== pageNum;

      set((s) => ({
        formFields: s.formFields
          .filter((f) => keep(f.page))
          .map((f) => ({ ...f, page: shift(f.page) })),
        pdfLinks: s.pdfLinks
          .filter((l) => keep(l.page))
          .map((l) => ({ ...l, page: shift(l.page) })),
        comments: s.comments
          .filter((c) => keep(c.page))
          .map((c) => ({ ...c, page: shift(c.page) })),
        pageOverlaySnapshots: new Map(
          Array.from(s.pageOverlaySnapshots.entries())
            .filter(([p]) => keep(p))
            .map(([p, sn]) => [shift(p), sn]),
        ),
        pdfNativeTextByPage: new Map(
          Array.from(s.pdfNativeTextByPage.entries())
            .filter(([p]) => keep(p))
            .map(([p, d]) => [shift(p), d]),
        ),
      }));

      await get().loadPdfFromBytes(newBytes, get().pdfFileName, {
        keepState: true,
      });
    },

    setTheme: (theme) => {
      set({ theme });
      if (theme === "dark") {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    },

    reset: async () => {
      const { pdf, fabricByPage } = get();
      await disposeAllFabricFromMap(fabricByPage);
      if (pdf) {
        await pdf.destroy();
      }
      const prevUrl = get().exportedBlobUrl;
      revokeIfUrl(prevUrl);
      set({
        pdf: null,
        pdfSourceBytes: null,
        pdfFileName: "",
        currentPage: 1,
        totalPages: 0,
        zoomLevel: 1,
        activeTool: "select",
        shapeVariant: "rectangle",
        annotateVariant: "highlight",
        formFieldVariant: "text",
        formFields: [],
        selectedFormFieldId: null,
        pdfLinks: [],
        comments: [],
        activeCommentId: null,
        commentPanelOpen: false,
        fabricByPage: new Map(),
        pageOverlaySnapshots: new Map(),
        pdfNativeTextByPage: new Map(),
        pendingImageInsert: null,
        pendingSignature: null,
        savedSignatures: [],
        history: [],
        exportedBlobUrl: null,
        exportedBytes: null,
        exportedFilename: "",
        isExporting: false,
        currentView: "editor",
        toastMessage: null,
        theme: "light",
      });
      document.documentElement.classList.remove("dark");
    },
  }),
);

export type { HistoryEntry };
