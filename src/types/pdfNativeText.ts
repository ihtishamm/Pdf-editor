/**
 * Persisted state for a PDF text run extracted via PDF.js (`getTextContent`), edited on the Fabric layer.
 * Positions are normalized to the viewer canvas so they survive zoom and resize.
 */
export type PdfNativeTextOriginalBounds = {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
};

export type PdfNativeTextRunState = {
  runId: string;
  originalPdfBounds: PdfNativeTextOriginalBounds;
  text: string;
  relLeft: number;
  relTop: number;
  relFontSize: number;
  angle: number;
  scaleX: number;
  scaleY: number;
  fontFamily: string;
  fill: string;
  fontWeight: string | number;
  fontStyle: string;
  direction: "ltr" | "rtl";
  textAlign: "left" | "right";
};
