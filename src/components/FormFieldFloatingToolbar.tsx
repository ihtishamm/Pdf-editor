import { Canvas, type FabricObject } from "fabric";
import { Trash2 } from "lucide-react";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { getFormFieldId, isFormFieldObject } from "../lib/fabricFormField";
import { usePdfEditorStore } from "../store/pdfEditorStore";
import type { EditorTool } from "../types/editorTools";
import type { FormFieldMeta } from "../types/formFields";

const FONT_SIZES = [10, 11, 12, 13, 14, 16, 18, 20, 24] as const;

type FormFieldFloatingToolbarProps = {
  canvas: Canvas | null;
  activeTool: EditorTool;
};

export function FormFieldFloatingToolbar({
  canvas,
  activeTool,
}: FormFieldFloatingToolbarProps) {
  const toolbarRef = useRef<HTMLDivElement>(null);
  const [target, setTarget] = useState<FabricObject | null>(null);
  const [tick, setTick] = useState(0);

  const formFields = usePdfEditorStore((s) => s.formFields);
  const updateFormField = usePdfEditorStore((s) => s.updateFormField);
  const removeFormField = usePdfEditorStore((s) => s.removeFormField);
  const setSelectedFormFieldId = usePdfEditorStore(
    (s) => s.setSelectedFormFieldId,
  );

  const bump = useCallback(() => {
    setTick((t) => t + 1);
  }, []);

  useEffect(() => {
    if (!canvas || activeTool !== "select") return;
    const sync = () => {
      const o = canvas.getActiveObject();
      setTarget(o && isFormFieldObject(o) ? o : null);
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

      const elWidth = el.offsetWidth || 500;
      const margin = 12;

      let top = br.top + bound.top - 56;
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

  useEffect(() => {
    if (!canvas || !target) return;
    const onAfter = () => bump();
    canvas.on("after:render", onAfter);
    return () => {
      canvas.off("after:render", onAfter);
    };
  }, [canvas, target, bump]);

  const fieldId = target ? getFormFieldId(target) : null;
  const meta = fieldId ? formFields.find((f) => f.id === fieldId) : undefined;

  const onPatch = useCallback(
    (patch: Parameters<typeof updateFormField>[1]) => {
      if (!fieldId) return;
      updateFormField(fieldId, patch);
      bump();
    },
    [fieldId, updateFormField, bump],
  );

  const onDelete = useCallback(() => {
    if (!canvas || !fieldId) return;
    removeFormField(fieldId);
    setSelectedFormFieldId(null);
    canvas.discardActiveObject();
    canvas.requestRenderAll();
    setTarget(null);
  }, [canvas, fieldId, removeFormField, setSelectedFormFieldId]);

  if (!target || !canvas || activeTool !== "select" || !meta) {
    return null;
  }

  return createPortal(
    <div
      ref={toolbarRef}
      className="fixed z-[200] flex max-w-[min(100vw-16px,520px)] flex-wrap items-center gap-2 rounded-lg border border-ring bg-surface-alt px-2.5 py-2 text-sm shadow-elevated"
      role="toolbar"
      aria-label="Form field"
    >
      <label className="flex items-center gap-1">
        <span className="whitespace-nowrap text-xs text-muted">Name</span>
        <input
          type="text"
          value={meta.name}
          onChange={(e) => onPatch({ name: e.target.value })}
          className="w-[120px] rounded border border-ring bg-surface-3 px-1.5 py-1 text-xs text-text"
        />
      </label>

      <div className="h-4 w-px bg-border" />

      <label className="flex items-center gap-1.5 px-0.5">
        <input
          type="checkbox"
          checked={meta.required}
          onChange={(e) => onPatch({ required: e.target.checked })}
          className="rounded border-ring bg-surface-3"
        />
        <span className="text-xs text-muted">Required</span>
      </label>

      <div className="h-4 w-px bg-border" />

      {meta.type === "text" || meta.type === "dropdown" ? (
        <label className="flex items-center gap-1">
          <span className="text-xs text-muted">Placeholder</span>
          <input
            type="text"
            value={meta.placeholder}
            onChange={(e) => onPatch({ placeholder: e.target.value })}
            className="w-[100px] rounded border border-ring bg-surface-3 px-1.5 py-1 text-xs text-text"
          />
        </label>
      ) : null}

      {meta.type === "dropdown" && (
        <DropdownOptionsEditor field={meta} onPatch={onPatch} />
      )}

      {meta.type === "radio" && (
        <>
          <label className="flex items-center gap-1">
            <span className="text-xs text-muted">Group</span>
            <input
              type="text"
              value={meta.radioGroupName}
              onChange={(e) => onPatch({ radioGroupName: e.target.value })}
              className="w-[70px] rounded border border-ring bg-surface-3 px-1.5 py-1 text-xs text-text"
            />
          </label>
          <label className="flex items-center gap-1">
            <span className="text-xs text-muted">Option ID</span>
            <input
              type="text"
              value={meta.radioOptionId}
              onChange={(e) => onPatch({ radioOptionId: e.target.value })}
              className="w-[60px] rounded border border-ring bg-surface-3 px-1.5 py-1 text-xs text-text"
            />
          </label>
        </>
      )}

      {meta.type === "button" && (
        <label className="flex items-center gap-1">
          <span className="text-xs text-muted">Label</span>
          <input
            type="text"
            value={meta.buttonLabel}
            onChange={(e) => onPatch({ buttonLabel: e.target.value })}
            className="w-[80px] rounded border border-ring bg-surface-3 px-1.5 py-1 text-xs text-text"
          />
        </label>
      )}

      <div className="h-4 w-px bg-border" />

      <label className="flex items-center gap-1">
        <span className="text-xs text-muted">Border</span>
        <input
          type="color"
          className="h-8 w-8 cursor-pointer rounded border border-ring bg-surface-3 p-0"
          value={meta.borderColor}
          onChange={(e) => onPatch({ borderColor: e.target.value })}
        />
      </label>

      <label className="flex items-center gap-1">
        <span className="text-xs text-muted">Text</span>
        <input
          type="color"
          className="h-8 w-8 cursor-pointer rounded border border-ring bg-surface-3 p-0"
          value={meta.textColor}
          onChange={(e) => onPatch({ textColor: e.target.value })}
        />
      </label>

      <label className="flex items-center gap-1">
        <span className="text-xs text-muted">Size</span>
        <select
          value={meta.fontSize}
          onChange={(e) => onPatch({ fontSize: Number(e.target.value) })}
          className="rounded border border-ring bg-surface-3 px-1 py-1 text-xs text-text"
        >
          {FONT_SIZES.map((n) => (
            <option key={n} value={n}>
              {n}px
            </option>
          ))}
        </select>
      </label>

      <div className="h-4 w-px bg-border" />

      <button
        type="button"
        onClick={onDelete}
        className="flex h-8 w-8 items-center justify-center rounded border border-destructive/30 text-destructive hover:bg-destructive/10"
        aria-label="Delete form field"
        title="Delete field"
      >
        <Trash2 className="h-4 w-4" strokeWidth={2} />
      </button>
    </div>,
    document.body,
  );
}

function DropdownOptionsEditor({
  field,
  onPatch,
}: {
  field: FormFieldMeta;
  onPatch: (patch: Partial<FormFieldMeta>) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="rounded border border-ring bg-surface-3 px-2 py-1 text-xs text-text hover:bg-surface-alt"
      >
        Options ({field.options.length})
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 z-[210] min-w-[200px] rounded-lg border border-ring bg-surface p-3 shadow-xl">
          <div className="mb-2 text-xs font-semibold text-muted">
            Dropdown items
          </div>
          <div className="flex flex-col gap-2">
            {field.options.map((opt: string, i: number) => (
              <div key={i} className="flex gap-1">
                <input
                  type="text"
                  value={opt}
                  onChange={(e) => {
                    const next = [...field.options];
                    next[i] = e.target.value;
                    onPatch({ options: next });
                  }}
                  className="min-w-0 flex-1 rounded border border-ring bg-surface-3 px-2 py-1 text-xs text-text"
                />
                <button
                  type="button"
                  disabled={field.options.length < 2}
                  onClick={() => {
                    onPatch({
                      options: field.options.filter((_, j) => j !== i),
                    });
                  }}
                  className="shrink-0 rounded bg-destructive/10 px-2 text-[10px] text-destructive disabled:opacity-30"
                >
                  ✕
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() =>
                onPatch({
                  options: [
                    ...field.options,
                    `Option ${field.options.length + 1}`,
                  ],
                })
              }
              className="mt-1 rounded border border-primary/20 bg-primary/5 py-1 text-[11px] font-medium text-primary hover:bg-primary/10"
            >
              + Add Item
            </button>
          </div>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="mt-3 w-full rounded border border-ring bg-surface-3 py-1 text-xs text-muted"
          >
            Close
          </button>
        </div>
      )}
    </div>
  );
}
