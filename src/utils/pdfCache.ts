import type { PDFPageProxy } from "pdfjs-dist";
import type { PDFOperatorList, PdfTextContent } from "../types/pdfItems";

export type PageCache = {
  textContent: PdfTextContent;
  operatorList: PDFOperatorList;
};

const cache = new Map<number, PageCache>();

export async function getCachedPageData(
  page: PDFPageProxy,
  pageNum: number,
): Promise<PageCache> {
  const existing = cache.get(pageNum);
  if (existing) return existing;

  const [textContent, operatorList] = await Promise.all([
    page.getTextContent(),
    page.getOperatorList(),
  ]);

  const data: PageCache = {
    textContent: textContent as PageCache["textContent"],
    operatorList: operatorList as PDFOperatorList,
  };
  cache.set(pageNum, data);
  return data;
}

export function clearPageCache() {
  cache.clear();
}
