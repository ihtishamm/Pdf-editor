import type { PDFPageProxy } from "pdfjs-dist";

/** Inferred from PDF.js `getTextContent()` — avoids importing non-exported API types. */
export type PdfTextContent = Awaited<
  ReturnType<PDFPageProxy["getTextContent"]>
>;

/** PDF.js text layer item (excludes TextMarkedContent entries). */
export type TextItem = Extract<
  PdfTextContent["items"][number],
  { str: string }
>;

/** PDF.js text layer marked content. */
export type TextMarkedContent = Extract<
  PdfTextContent["items"][number],
  { type: string; id: string }
>;

export interface PDFOperatorList {
  fnArray: number[];
  argsArray: unknown[][];
}
