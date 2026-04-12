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
      className="fixed right-0 top-0 z-[110] flex h-full w-[min(100vw,360px)] flex-col border-l border-ring bg-surface shadow-elevated"
      aria-label="Comments"
    >
      <div className="flex items-center justify-between border-b border-ring px-4 py-3">
        <div className="flex items-center gap-2 font-display text-sm font-semibold text-near-black">
          <MessageSquare className="h-4 w-4 text-primary" strokeWidth={1.75} />
          Comments
        </div>
        <button
          type="button"
          className="rounded-btn p-1 text-muted transition-colors hover:bg-surface-alt hover:text-near-black"
          aria-label="Close comments"
          onClick={() => setCommentPanelOpen(false)}
        >
          <X className="h-5 w-5" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-3">
        {pageComments.length === 0 ? (
          <p className="text-sm text-muted">No comments on this page.</p>
        ) : (
          <ul className="space-y-2">
            {pageComments.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => setActiveCommentId(c.id)}
                  className={`w-full rounded-btn border px-3 py-2 text-left text-sm transition-colors ${
                    activeCommentId === c.id
                      ? 'border-primary bg-primary/6'
                      : 'border-transparent hover:bg-surface-alt'
                  }`}
                >
                  <span className="block truncate text-xs text-muted">
                    {c.body.trim() ? c.body.slice(0, 80) : 'Empty comment'}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      {active ? (
        <div className="border-t border-ring p-3">
          <label className="block text-xs font-medium text-muted">Comment text</label>
          <textarea
            className="mt-1.5 w-full rounded-btn border border-input-border bg-surface px-3 py-2 text-sm text-near-black placeholder:text-placeholder focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            rows={5}
            value={active.body}
            onChange={(e) => updateCommentBody(active.id, e.target.value)}
            placeholder="Write a note…"
          />
          <button
            type="button"
            className="mt-2 text-sm font-medium text-destructive transition-colors hover:underline"
            onClick={() => removeComment(active.id)}
          >
            Delete comment
          </button>
        </div>
      ) : null}
    </aside>
  )
}
