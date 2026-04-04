import { useEffect, useState } from 'react'
import { EditorShell } from './components/EditorShell'
import { PDFViewer } from './components/PDFViewer'
import { ThumbnailSidebar } from './components/ThumbnailSidebar'
import { usePdfEditorStore } from './store/pdfEditorStore'

function App() {
  const [thumbnailsOpen, setThumbnailsOpen] = useState(true)
  const pdf = usePdfEditorStore((s) => s.pdf)
  const loadBlankA4 = usePdfEditorStore((s) => s.loadBlankA4)
  const currentPage = usePdfEditorStore((s) => s.currentPage)
  const totalPages = usePdfEditorStore((s) => s.totalPages)
  const setPage = usePdfEditorStore((s) => s.setPage)

  useEffect(() => {
    void loadBlankA4()
  }, [loadBlankA4])

  return (
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
  )
}

export default App
