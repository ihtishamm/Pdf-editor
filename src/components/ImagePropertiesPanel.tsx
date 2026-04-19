import { Canvas, FabricImage } from "fabric";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import {
  ArrowDown,
  ArrowUp,
  FlipHorizontal2,
  FlipVertical2,
  Trash2,
} from "lucide-react";
import { isPlacedFabricImage } from "../lib/insertFabricImage";
import type { EditorTool } from "../types/editorTools";

type ImagePropertiesPanelProps = {
  canvas: Canvas | null;
  activeTool: EditorTool;
};

export function ImagePropertiesPanel({
  canvas,
  activeTool,
}: ImagePropertiesPanelProps) {
  const toolbarRef = useRef<HTMLDivElement>(null);
  const [target, setTarget] = useState<FabricImage | null>(null);
  const [tick, setTick] = useState(0);

  const bump = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    if (!canvas || activeTool !== "select") return;
    const sync = () => {
      const o = canvas.getActiveObject();
      setTarget(o && isPlacedFabricImage(o) ? o : null);
      bump();
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
  }, [canvas, activeTool, bump]);

  useLayoutEffect(() => {
    if (!canvas || !target || !toolbarRef.current) return;
    const el = toolbarRef.current;
    const bound = target.getBoundingRect();
    const br = canvas.upperCanvasEl.getBoundingClientRect();
    el.style.left = `${br.left + bound.left}px`;
    el.style.top = `${Math.max(8, br.top + bound.top - 48)}px`;
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
    (fn: (img: FabricImage) => void) => {
      if (!canvas || !target) return;
      fn(target);
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
    setTarget(null);
  };

  if (!canvas || !target || activeTool !== "select") {
    return null;
  }

  const opacity = typeof target.opacity === "number" ? target.opacity : 1;
  const flipX = !!target.flipX;
  const flipY = !!target.flipY;

  return createPortal(
    <div
      ref={toolbarRef}
      className="fixed z-100 flex max-w-[min(100vw-16px,520px)] flex-wrap items-center gap-2 rounded-lg border border-ring bg-surface-alt px-2.5 py-1.5 text-sm shadow-elevated"
      role="toolbar"
      aria-label="Image operations"
    >
      <div className="flex items-center gap-1.5 px-1">
        <span className="text-[11px] font-bold uppercase tracking-wider text-muted">
          Image
        </span>
      </div>

      <div className="h-4 w-px bg-border" />

      <div className="flex items-center gap-1">
        <button
          type="button"
          className={`flex h-8 w-8 items-center justify-center rounded border border-ring transition-colors ${
            flipX
              ? "bg-primary/10 text-primary border-primary/30"
              : "bg-surface-3 text-muted hover:bg-surface-alt hover:text-text"
          }`}
          title="Flip Horizontal"
          onClick={() => apply((img) => img.set({ flipX: !img.flipX }))}
        >
          <FlipHorizontal2 className="h-4 w-4" />
        </button>
        <button
          type="button"
          className={`flex h-8 w-8 items-center justify-center rounded border border-ring transition-colors ${
            flipY
              ? "bg-primary/10 text-primary border-primary/30"
              : "bg-surface-3 text-muted hover:bg-surface-alt hover:text-text"
          }`}
          title="Flip Vertical"
          onClick={() => apply((img) => img.set({ flipY: !img.flipY }))}
        >
          <FlipVertical2 className="h-4 w-4" />
        </button>
      </div>

      <div className="h-4 w-px bg-border" />

      <div className="flex items-center gap-1">
        <button
          type="button"
          className="flex h-8 w-8 items-center justify-center rounded border border-ring bg-surface-3 text-muted transition-colors hover:bg-surface-alt hover:text-text"
          title="Bring Forward"
          onClick={() => {
            canvas.bringObjectForward(target);
            canvas.requestRenderAll();
            bump();
          }}
        >
          <ArrowUp className="h-4 w-4" />
        </button>
        <button
          type="button"
          className="flex h-8 w-8 items-center justify-center rounded border border-ring bg-surface-3 text-muted transition-colors hover:bg-surface-alt hover:text-text"
          title="Send Backward"
          onClick={() => {
            canvas.sendObjectBackwards(target);
            canvas.requestRenderAll();
            bump();
          }}
        >
          <ArrowDown className="h-4 w-4" />
        </button>
      </div>

      <div className="h-4 w-px bg-border" />

      <label className="flex items-center gap-2 px-1">
        <span className="text-[11px] text-muted">Opacity</span>
        <input
          type="range"
          min={0}
          max={100}
          className="h-1.5 w-16 accent-primary"
          value={Math.round(opacity * 100)}
          onChange={(e) => {
            const v = Number(e.target.value) / 100;
            apply((img) => img.set({ opacity: Math.min(1, Math.max(0, v)) }));
          }}
        />
      </label>

      <div className="h-4 w-px bg-border" />

      <button
        type="button"
        onClick={onDelete}
        className="flex h-8 w-8 items-center justify-center rounded border border-destructive/30 text-destructive hover:bg-destructive/10"
        title="Delete Image"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>,
    document.body,
  );
}
