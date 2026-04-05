import { MessageSquare, X } from 'lucide-react'
import { usePdfEditorStore } from '../store/pdfEditorStore'

export function CommentPanel() {
  const commentPanelOpen = usePdfEditorStore((s) => s.commentPanelOpen)
  const setCommentPanelOpen = usePdfEditorStore((s) => s.setCommentPanelOpen)
  const comments = usePdfEditorStore((s) => s.comments)
  const activeCommentId = usePdfEditorStore((s) => s.activeCommentId)
  const setActiveCommentId = usePdfEditorStore((s) => s.setActiveCommentId)
  const updateCommentBody = usePdfEditorStore((s) => s.updateCommentBody)
  const removeComment = usePdfEditorStore((s) => s.removeComment)
  const currentPage = usePdfEditorStore((s) => s.currentPage)

  if (!commentPanelOpen) {
    return null
  }

  const pageComments = comments.filter((c) => c.page === currentPage)
  const active =
    comments.find((c) => c.id === activeCommentId) ?? pageComments[0] ?? null

  return (
    <aside
      className="fixed right-0 top-0 z-[110] flex h-full w-[min(100vw,360px)] flex-col border-l border-[#e0e0e0] bg-white shadow-lg"
      aria-label="Comments"
    >
      <div className="flex items-center justify-between border-b border-[#e8e8e8] px-4 py-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-[#333]">
          <MessageSquare className="h-4 w-4 text-[#40a9ff]" strokeWidth={1.75} />
          Comments
        </div>
        <button
          type="button"
          className="rounded p-1 text-[#666] hover:bg-slate-100"
          aria-label="Close comments"
          onClick={() => setCommentPanelOpen(false)}
        >
          <X className="h-5 w-5" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-3">
        {pageComments.length === 0 ? (
          <p className="text-sm text-[#888]">No comments on this page.</p>
        ) : (
          <ul className="space-y-2">
            {pageComments.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => setActiveCommentId(c.id)}
                  className={`w-full rounded border px-2 py-1.5 text-left text-sm ${
                    activeCommentId === c.id
                      ? 'border-[#40a9ff] bg-[#f0f8ff]'
                      : 'border-transparent hover:bg-slate-50'
                  }`}
                >
                  <span className="block truncate text-xs text-[#888]">
                    {c.body.trim() ? c.body.slice(0, 80) : 'Empty comment'}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      {active ? (
        <div className="border-t border-[#e8e8e8] p-3">
          <label className="block text-xs font-medium text-[#666]">Comment text</label>
          <textarea
            className="mt-1 w-full rounded border border-slate-300 px-2 py-2 text-sm text-[#333]"
            rows={5}
            value={active.body}
            onChange={(e) => updateCommentBody(active.id, e.target.value)}
            placeholder="Write a note…"
          />
          <button
            type="button"
            className="mt-2 text-sm text-red-600 hover:underline"
            onClick={() => removeComment(active.id)}
          >
            Delete comment
          </button>
        </div>
      ) : null}
    </aside>
  )
}
