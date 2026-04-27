import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { DocumentReadyScreen } from "../components/DocumentReadyScreen";
import { EditorShell } from "../components/EditorShell";
import { ExportingOverlay } from "../components/ExportingOverlay";
import { PDFViewer } from "../components/PDFViewer";
import { ToastHost } from "../components/ToastHost";
import { usePdfEditorStore } from "../store/pdfEditorStore";
import { SEO } from "../components/SEO";

export function EditorPage() {
  const pdf = usePdfEditorStore((s) => s.pdf);
  const loadBlankA4 = usePdfEditorStore((s) => s.loadBlankA4);
  const currentView = usePdfEditorStore((s) => s.currentView);

  const { search } = useLocation();
  const query = new URLSearchParams(search);
  const action = query.get("action");

  useEffect(() => {
    if (action === "blank") {
      void loadBlankA4();
    } else if (!pdf) {
      void loadBlankA4();
    }
  }, [loadBlankA4, pdf, action]);

  return (
    <div className="editor-theme">
      <SEO
        title="Editor"
        description="Powerful PDF editing tools at your fingertips. Edit text, add images, and sign your PDF documents with ease."
      />
      <ExportingOverlay />
      <ToastHost />
      <div className={currentView === "ready" ? "hidden" : "block"}>
        <EditorShell>
          <PDFViewer />
        </EditorShell>
      </div>
      {currentView === "ready" ? <DocumentReadyScreen /> : null}
    </div>
  );
}
