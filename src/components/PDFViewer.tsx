import { useCallback, useEffect, useRef, useState } from "react";
import { IText } from "fabric";
import { Plus } from "lucide-react";
import { usePdfEditorStore } from "../store/pdfEditorStore";
import { PDFPage } from "./PDFPage";
import { FormFieldFloatingToolbar } from "./FormFieldFloatingToolbar";
import { ShapePropertiesToolbar } from "./ShapePropertiesToolbar";
import { ImagePropertiesPanel } from "./ImagePropertiesPanel";
import { TextEditToolbar } from "./TextEditToolbar";
import { CommentPopover } from "./CommentPopover";

/**
 * Renders all PDF pages in a scrollable vertical list.
 * Synchronization with the store's currentPage is handled via IntersectionObserver on each page.
 */
export function PDFViewer() {
  const totalPages = usePdfEditorStore((s) => s.totalPages);
  const setPage = usePdfEditorStore((s) => s.setPage);
  const insertPage = usePdfEditorStore((s) => s.insertPage);
  const activeTool = usePdfEditorStore((s) => s.activeTool);
  const fabricByPage = usePdfEditorStore((s) => s.fabricByPage);
  const currentPage = usePdfEditorStore((s) => s.currentPage);

  const measureRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [selectedIText, setSelectedIText] = useState<IText | null>(null);
  const lastViewedPage = useRef(1);

  useEffect(() => {
    const el = measureRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      setContainerWidth(el.getBoundingClientRect().width);
    });
    ro.observe(el);
    setContainerWidth(el.getBoundingClientRect().width);
    return () => ro.disconnect();
  }, []);

  const handleInView = useCallback(
    (num: number) => {
      if (lastViewedPage.current !== num) {
        lastViewedPage.current = num;
        setPage(num);
      }
    },
    [setPage],
  );

  const handleSelectionIText = useCallback((t: IText | null) => {
    setSelectedIText(t);
  }, []);

  // Get active canvas for toolbars
  const activeCanvas = fabricByPage.get(currentPage) || null;

  return (
    <div className="flex min-w-0 flex-1 flex-col bg-surface-alt">
      <div
        ref={measureRef}
        className="relative flex min-w-0 flex-1 flex-col items-center px-4 pb-64 pt-12"
      >
        <TextEditToolbar canvas={activeCanvas} target={selectedIText} />
        <FormFieldFloatingToolbar
          canvas={activeCanvas}
          activeTool={activeTool}
        />
        <ShapePropertiesToolbar canvas={activeCanvas} activeTool={activeTool} />
        <ImagePropertiesPanel canvas={activeCanvas} activeTool={activeTool} />
        <CommentPopover canvas={activeCanvas} />

        <div className="flex w-full max-w-full flex-col gap-4">
          {/* Insert before first page */}
          <AddPageDivider onAdd={() => insertPage(0)} />

          {Array.from({ length: totalPages }, (_, i) => i + 1).map((num) => (
            <div key={`page-wrapper-${num}`}>
              <PDFPage
                pageNum={num}
                containerWidth={containerWidth}
                onInView={handleInView}
                onSelectionIText={handleSelectionIText}
              />
              <AddPageDivider onAdd={() => insertPage(num)} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function AddPageDivider({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="group relative flex h-8 w-full items-center justify-center">
      <div className="h-px w-full bg-border/40 transition-colors group-hover:bg-primary/30" />
      <button
        onClick={onAdd}
        className="absolute flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1 text-[11px] font-medium text-muted opacity-0 shadow-sm transition-all hover:border-primary hover:text-primary group-hover:opacity-100"
      >
        <Plus className="h-3 w-3" />
        Insert Page
      </button>
    </div>
  );
}
