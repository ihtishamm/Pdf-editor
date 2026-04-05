import { usePdfEditorStore } from '../store/pdfEditorStore'

export function FormFieldPropertiesPanel() {
  const selectedId = usePdfEditorStore((s) => s.selectedFormFieldId)
  const field = usePdfEditorStore((s) =>
    s.formFields.find((f) => f.id === s.selectedFormFieldId),
  )
  const updateFormField = usePdfEditorStore((s) => s.updateFormField)
  const removeFormField = usePdfEditorStore((s) => s.removeFormField)
  const setSelectedFormFieldId = usePdfEditorStore((s) => s.setSelectedFormFieldId)

  if (!selectedId || !field) return null

  const setOptionAt = (i: number, value: string) => {
    const next = [...field.options]
    next[i] = value
    updateFormField(field.id, { options: next })
  }

  const addOption = () => {
    updateFormField(field.id, {
      options: [...field.options, `Option ${field.options.length + 1}`],
    })
  }

  const removeOption = (i: number) => {
    if (field.options.length < 2) return
    updateFormField(field.id, {
      options: field.options.filter((_, j) => j !== i),
    })
  }

  return (
    <aside
      className="hidden w-[280px] shrink-0 flex-col border-l border-[#e0e0e0] bg-white lg:flex"
      aria-label="Form field properties"
    >
      <div className="border-b border-[#e8e8e8] px-3 py-2 text-sm font-semibold text-[#333]">
        Field properties
      </div>
      <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-3 text-sm">
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-[#666]">Field name</span>
          <input
            type="text"
            value={field.name}
            onChange={(e) => updateFormField(field.id, { name: e.target.value })}
            className="rounded border border-[#d9d9d9] px-2 py-1.5 text-[#333]"
          />
        </label>

        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-[#666]">Border</span>
            <input
              type="color"
              value={field.borderColor}
              onChange={(e) =>
                updateFormField(field.id, { borderColor: e.target.value })
              }
              className="h-9 w-12 cursor-pointer rounded border border-[#d9d9d9] bg-white p-0"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-[#666]">Text color</span>
            <input
              type="color"
              value={field.textColor}
              onChange={(e) =>
                updateFormField(field.id, { textColor: e.target.value })
              }
              className="h-9 w-12 cursor-pointer rounded border border-[#d9d9d9] bg-white p-0"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-[#666]">Font size</span>
            <select
              value={field.fontSize}
              onChange={(e) =>
                updateFormField(field.id, { fontSize: Number(e.target.value) })
              }
              className="rounded border border-[#d9d9d9] bg-white px-2 py-1.5 text-[#333]"
            >
              {[10, 11, 12, 13, 14, 16, 18, 20, 24].map((n) => (
                <option key={n} value={n}>
                  {n}px
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="flex cursor-pointer items-center gap-2">
          <input
            type="checkbox"
            checked={field.required}
            onChange={(e) =>
              updateFormField(field.id, { required: e.target.checked })
            }
            className="rounded border-[#d9d9d9]"
          />
          <span className="text-[#333]">Required</span>
        </label>

        {field.type === 'text' || field.type === 'dropdown' ? (
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-[#666]">Placeholder</span>
            <input
              type="text"
              value={field.placeholder}
              onChange={(e) =>
                updateFormField(field.id, { placeholder: e.target.value })
              }
              className="rounded border border-[#d9d9d9] px-2 py-1.5 text-[#333]"
            />
          </label>
        ) : null}

        {field.type === 'radio' ? (
          <>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-[#666]">Radio group</span>
              <input
                type="text"
                value={field.radioGroupName}
                onChange={(e) =>
                  updateFormField(field.id, { radioGroupName: e.target.value })
                }
                className="rounded border border-[#d9d9d9] px-2 py-1.5 text-[#333]"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-[#666]">Option id</span>
              <input
                type="text"
                value={field.radioOptionId}
                onChange={(e) =>
                  updateFormField(field.id, { radioOptionId: e.target.value })
                }
                className="rounded border border-[#d9d9d9] px-2 py-1.5 font-mono text-xs text-[#333]"
              />
              <span className="text-[11px] leading-snug text-[#888]">
                Unique within the group; exported to pdf-lib{' '}
                <code className="rounded bg-[#f5f5f5] px-0.5">addOptionToPage</code>.
              </span>
            </label>
          </>
        ) : null}

        {field.type === 'button' ? (
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-[#666]">Button label</span>
            <input
              type="text"
              value={field.buttonLabel}
              onChange={(e) =>
                updateFormField(field.id, { buttonLabel: e.target.value })
              }
              className="rounded border border-[#d9d9d9] px-2 py-1.5 text-[#333]"
            />
          </label>
        ) : null}

        {field.type === 'dropdown' ? (
          <div className="flex flex-col gap-2">
            <span className="text-xs font-medium text-[#666]">Dropdown options</span>
            <ul className="flex flex-col gap-1.5">
              {field.options.map((opt, i) => (
                <li key={i} className="flex gap-1">
                  <input
                    type="text"
                    value={opt}
                    onChange={(e) => setOptionAt(i, e.target.value)}
                    className="min-w-0 flex-1 rounded border border-[#d9d9d9] px-2 py-1 text-[#333]"
                  />
                  <button
                    type="button"
                    disabled={field.options.length < 2}
                    onClick={() => removeOption(i)}
                    className="shrink-0 rounded border border-[#d9d9d9] px-2 py-1 text-xs text-[#666] hover:bg-[#fff1f0] disabled:opacity-40"
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={addOption}
              className="rounded border border-[#b3d7ff] bg-[#f0f8ff] px-2 py-1 text-xs font-medium text-[#333]"
            >
              Add option
            </button>
          </div>
        ) : null}

        <button
          type="button"
          onClick={() => {
            removeFormField(field.id)
            setSelectedFormFieldId(null)
          }}
          className="mt-auto rounded border border-[#ffccc7] bg-[#fff2f0] px-2 py-2 text-sm text-[#cf1322]"
        >
          Delete field
        </button>
      </div>
    </aside>
  )
}
