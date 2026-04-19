import { Canvas, type FabricObject } from "fabric";
import { Send, Trash2, X } from "lucide-react";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { usePdfEditorStore } from "../store/pdfEditorStore";

type CommentPopoverProps = {
  canvas: Canvas | null;
};

export function CommentPopover({ canvas }: CommentPopoverProps) {
  const popoverRef = useRef<HTMLDivElement>(null);
  const [target, setTarget] = useState<FabricObject | null>(null);
  const [commentId, setCommentId] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const comments = usePdfEditorStore((s) => s.comments);
  const updateCommentBody = usePdfEditorStore((s) => s.updateCommentBody);
  const removeComment = usePdfEditorStore((s) => s.removeComment);

  const bump = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    if (!canvas) return;
    const sync = () => {
      const o = canvas.getActiveObject();
      const d = (
        o as FabricObject & { data?: { tool?: string; commentId?: string } }
      )?.data;
      if (d?.tool === "commentPin" && d.commentId) {
        setTarget(o ?? null);
        setCommentId(d.commentId);
      } else {
        setTarget(null);
        setCommentId(null);
      }
    };
    canvas.on("selection:created", sync);
    canvas.on("selection:updated", sync);
    canvas.on("selection:cleared", sync);
    canvas.on("object:modified", bump);
    sync();
    return () => {
      canvas.off("selection:created", sync);
      canvas.off("selection:updated", sync);
      canvas.off("selection:cleared", sync);
      canvas.off("object:modified", bump);
    };
  }, [canvas, bump]);

  useLayoutEffect(() => {
    if (!canvas || !target || !popoverRef.current) return;
    const el = popoverRef.current;
    const place = () => {
      const bound = target.getBoundingRect();
      const br = canvas.upperCanvasEl.getBoundingClientRect();

      const elWidth = el.offsetWidth || 280;
      const margin = 12;

      let top = br.top + bound.top - (el.offsetHeight || 140) - 12;
      if (top < 64) top = br.top + bound.top + bound.height + 12;

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

  const comment = comments.find((c) => c.id === commentId);

  if (!target || !comment || !canvas) return null;

  return createPortal(
    <div
      ref={popoverRef}
      className="fixed z-120 w-72 animate-in fade-in zoom-in duration-200 rounded-xl border border-ring bg-surface p-3 shadow-elevated"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[11px] font-bold uppercase tracking-wider text-placeholder">
          Note
        </span>
        <button
          onClick={() => {
            canvas.discardActiveObject();
            canvas.requestRenderAll();
          }}
          className="rounded-full p-1 text-muted hover:bg-surface-alt hover:text-text"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <textarea
        autoFocus
        className="block min-h-[80px] w-full resize-none rounded-lg border border-input-border bg-surface-alt px-3 py-2 text-sm text-text placeholder:text-placeholder focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        placeholder="Type a comment..."
        value={comment.body}
        onChange={(e) => updateCommentBody(comment.id, e.target.value)}
      />

      <div className="mt-3 flex items-center justify-between">
        <button
          type="button"
          onClick={() => {
            removeComment(comment.id);
            canvas.remove(target);
            canvas.discardActiveObject();
            canvas.requestRenderAll();
          }}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-destructive hover:bg-destructive/10"
          title="Delete comment"
        >
          <Trash2 className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => {
            canvas.discardActiveObject();
            canvas.requestRenderAll();
          }}
          className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-1.5 text-[13px] font-medium text-white shadow-sm transition-all hover:bg-primary-hover active:scale-95"
        >
          <Send className="h-3.5 w-3.5" />
          Save
        </button>
      </div>
    </div>,
    document.body,
  );
}
