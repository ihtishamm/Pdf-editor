import { useEffect, useState } from 'react'
import { DocumentReadyScreen } from '../components/DocumentReadyScreen'
import { EditorShell } from '../components/EditorShell'
import { ExportingOverlay } from '../components/ExportingOverlay'
import { PDFViewer } from '../components/PDFViewer'
import { ThumbnailSidebar } from '../components/ThumbnailSidebar'
import { ToastHost } from '../components/ToastHost'
import { usePdfEditorStore } from '../store/pdfEditorStore'

export function EditorPage() {
  const [thumbnailsOpen, setThumbnailsOpen] = useState(true)
  const pdf = usePdfEditorStore((s) => s.pdf)
  const loadBlankA4 = usePdfEditorStore((s) => s.loadBlankA4)
  const currentPage = usePdfEditorStore((s) => s.currentPage)
  const totalPages = usePdfEditorStore((s) => s.totalPages)
  const setPage = usePdfEditorStore((s) => s.setPage)
  const currentView = usePdfEditorStore((s) => s.currentView)

  useEffect(() => {
    void loadBlankA4()
  }, [loadBlankA4])

  return (
    <div className="editor-theme min-h-dvh">
      <ExportingOverlay />
      <ToastHost />
      <div className={currentView === 'ready' ? 'hidden' : 'block'}>
        <EditorShell
          thumbnailsOpen={thumbnailsOpen}
          onToggleThumbnails={() => setThumbnailsOpen((o) => !o)}
        >
          <div className="flex min-h-full w-full">
            <div className="min-w-0 flex-1">
              <PDFViewer />
            </div>
            {thumbnailsOpen && pdf ? (
              <ThumbnailSidebar
                pdf={pdf}
                totalPages={totalPages}
                currentPage={currentPage}
                onSelectPage={setPage}
              />
            ) : null}
          </div>
        </EditorShell>
      </div>
      {currentView === 'ready' ? <DocumentReadyScreen /> : null}
    </div>
  )
}
