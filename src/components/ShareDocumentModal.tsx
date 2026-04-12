import { X } from 'lucide-react'
import { useState } from 'react'
import { usePdfEditorStore } from '../store/pdfEditorStore'
import { Button } from './ui/Button'

type ShareDocumentModalProps = {
  open: boolean
  onClose: () => void
}

export function ShareDocumentModal({ open, onClose }: ShareDocumentModalProps) {
  const exportedBlobUrl = usePdfEditorStore((s) => s.exportedBlobUrl)
  const exportedFilename = usePdfEditorStore((s) => s.exportedFilename)
  const showToast = usePdfEditorStore((s) => s.showToast)

  const [tab, setTab] = useState<'email' | 'link'>('email')
  const [recipient, setRecipient] = useState('')
  const [message, setMessage] = useState('')

  if (!open) return null

  const shareLink = exportedBlobUrl ?? ''

  const sendMailto = () => {
    const to = recipient.trim()
    if (!to) {
      showToast('Enter a recipient email address.')
      return
    }
    const subject = encodeURIComponent(
      exportedFilename || 'Document',
    )
    const linkLine = shareLink
      ? `\n\nDownload link (this browser session only):\n${shareLink}`
      : ''
    const body = encodeURIComponent(
      (message.trim() ? `${message.trim()}${linkLine}` : `Here is your document.${linkLine}`),
    )
    window.location.href = `mailto:${encodeURIComponent(to)}?subject=${subject}&body=${body}`
  }

  const copyLink = async () => {
    if (!shareLink) {
      showToast('No share link available.')
      return
    }
    try {
      await navigator.clipboard.writeText(shareLink)
      showToast('Link copied to clipboard.')
    } catch {
      showToast('Could not copy link.')
    }
  }

  const tryNativeShare = async () => {
    if (!shareLink || !navigator.share) {
      showToast('Sharing is not available on this device.')
      return
    }
    try {
      await navigator.share({
        title: exportedFilename || 'PDF',
        text: `Open this temporary link in the same browser: ${shareLink}`,
        url: shareLink,
      })
    } catch (e) {
      if ((e as Error).name !== 'AbortError') {
        showToast('Share was cancelled or failed.')
      }
    }
  }

  return (
    <div
      className="fixed inset-0 z-[500] flex items-center justify-center bg-near-black/40 p-4 backdrop-blur-sm"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        className="w-full max-w-md rounded-panel border border-ring bg-surface shadow-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="share-doc-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-ring px-5 py-4">
          <h2 id="share-doc-title" className="font-display text-lg font-semibold text-near-black">
            Share document
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-btn p-1 text-muted transition-colors hover:bg-surface-alt hover:text-near-black"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-ring">
          <button
            type="button"
            onClick={() => setTab('email')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              tab === 'email'
                ? 'border-b-2 border-primary text-primary'
                : 'text-muted hover:text-near-black'
            }`}
          >
            Share by email
          </button>
          <button
            type="button"
            onClick={() => setTab('link')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              tab === 'link'
                ? 'border-b-2 border-primary text-primary'
                : 'text-muted hover:text-near-black'
            }`}
          >
            Share by link
          </button>
        </div>

        {/* Body */}
        <div className="p-5">
          {tab === 'email' ? (
            <div className="space-y-4">
              <p className="text-xs text-muted">
                We'll open your email app with a message containing a temporary session link to this file.
              </p>
              <label className="block text-xs font-medium text-muted">
                Recipient email
                <input
                  type="email"
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                  placeholder="name@example.com"
                  className="mt-1.5 w-full rounded-btn border border-input-border bg-surface px-3 py-2.5 text-sm text-near-black placeholder:text-placeholder focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </label>
              <label className="block text-xs font-medium text-muted">
                Message (optional)
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={3}
                  className="mt-1.5 w-full rounded-btn border border-input-border bg-surface px-3 py-2.5 text-sm text-near-black placeholder:text-placeholder focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </label>
              <Button variant="primary" className="w-full" onClick={sendMailto}>
                Send
              </Button>
              {typeof navigator !== 'undefined' && 'share' in navigator && (
                <Button
                  variant="secondary"
                  className="w-full"
                  onClick={() => void tryNativeShare()}
                >
                  Use device share…
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <label className="block text-xs font-medium text-muted">
                Temporary link
                <input
                  readOnly
                  value={shareLink}
                  className="mt-1.5 w-full rounded-btn border border-input-border bg-surface-alt px-3 py-2.5 font-mono text-xs text-near-black focus:outline-none"
                />
              </label>
              <Button variant="primary" className="w-full" onClick={() => void copyLink()}>
                Copy link
              </Button>
              <p className="text-xs text-muted">
                This link is temporary and works only in this browser session. Nothing is uploaded to a server.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
