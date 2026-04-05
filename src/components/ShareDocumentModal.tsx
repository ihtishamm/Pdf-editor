import { X } from 'lucide-react'
import { useState } from 'react'
import { usePdfEditorStore } from '../store/pdfEditorStore'

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
      className="fixed inset-0 z-[500] flex items-center justify-center bg-black/40 p-4"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        className="w-full max-w-md rounded-lg border border-[#e5e5e5] bg-white shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="share-doc-title"
      >
        <div className="flex items-center justify-between border-b border-[#eee] px-4 py-3">
          <h2 id="share-doc-title" className="text-lg font-semibold text-[#222]">
            Share document
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-[#666] hover:bg-[#f5f5f5]"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex border-b border-[#eee]">
          <button
            type="button"
            onClick={() => setTab('email')}
            className={`flex-1 px-3 py-2.5 text-sm font-medium ${
              tab === 'email'
                ? 'border-b-2 border-[#00a67e] text-[#00a67e]'
                : 'text-[#666]'
            }`}
          >
            Share by email
          </button>
          <button
            type="button"
            onClick={() => setTab('link')}
            className={`flex-1 px-3 py-2.5 text-sm font-medium ${
              tab === 'link'
                ? 'border-b-2 border-[#00a67e] text-[#00a67e]'
                : 'text-[#666]'
            }`}
          >
            Share by link
          </button>
        </div>

        <div className="p-4">
          {tab === 'email' ? (
            <div className="space-y-3">
              <p className="text-xs text-[#666]">
                Browsers cannot attach files via <code className="rounded bg-[#f3f3f3] px-1">mailto:</code>.
                We open your email app with a message that includes a temporary session link to this file.
              </p>
              <label className="block text-xs font-medium text-[#555]">
                Recipient email
                <input
                  type="email"
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                  placeholder="name@example.com"
                  className="mt-1 w-full rounded border border-[#ddd] px-3 py-2 text-sm"
                />
              </label>
              <label className="block text-xs font-medium text-[#555]">
                Message (optional)
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={3}
                  className="mt-1 w-full rounded border border-[#ddd] px-3 py-2 text-sm"
                />
              </label>
              <button
                type="button"
                onClick={sendMailto}
                className="w-full rounded-md bg-[#00a67e] py-2.5 text-sm font-semibold text-white hover:bg-[#00916d]"
              >
                Send
              </button>
              {typeof navigator !== 'undefined' && 'share' in navigator && (
                <button
                  type="button"
                  onClick={() => void tryNativeShare()}
                  className="w-full rounded-md border border-[#ddd] py-2 text-sm text-[#333] hover:bg-[#fafafa]"
                >
                  Use device share…
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <label className="block text-xs font-medium text-[#555]">
                Temporary link
                <input
                  readOnly
                  value={shareLink}
                  className="mt-1 w-full rounded border border-[#ddd] bg-[#fafafa] px-3 py-2 font-mono text-xs"
                />
              </label>
              <button
                type="button"
                onClick={() => void copyLink()}
                className="w-full rounded-md bg-[#00a67e] py-2.5 text-sm font-semibold text-white hover:bg-[#00916d]"
              >
                Copy link
              </button>
              <p className="text-xs text-[#888]">
                This link is temporary and works only in this browser session. It is not uploaded to a server.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
