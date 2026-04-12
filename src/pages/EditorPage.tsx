import { useEffect } from 'react'
import { DocumentReadyScreen } from '../components/DocumentReadyScreen'
import { EditorShell } from '../components/EditorShell'
import { ExportingOverlay } from '../components/ExportingOverlay'
import { PDFViewer } from '../components/PDFViewer'
import { ToastHost } from '../components/ToastHost'
import { usePdfEditorStore } from '../store/pdfEditorStore'

export function EditorPage() {
  const loadBlankA4 = usePdfEditorStore((s) => s.loadBlankA4)
  const currentView = usePdfEditorStore((s) => s.currentView)

  useEffect(() => {
    void loadBlankA4()
  }, [loadBlankA4])

  return (
    <div className="editor-theme">
      <ExportingOverlay />
      <ToastHost />
      <div className={currentView === 'ready' ? 'hidden' : 'block'}>
        <EditorShell>
          <PDFViewer />
        </EditorShell>
      </div>
      {currentView === 'ready' ? <DocumentReadyScreen /> : null}
    </div>
  )
}
