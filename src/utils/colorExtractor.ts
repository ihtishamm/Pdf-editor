import { OPS } from "pdfjs-dist";
import type { PDFOperatorList } from "../types/pdfItems";

export function extractColorForText(
  operatorList: PDFOperatorList,
  textStr: string,
): string {
  let currentColor = "#000000";

  for (let i = 0; i < operatorList.fnArray.length; i++) {
    const fn = operatorList.fnArray[i];
    const args = operatorList.argsArray[i];

    if (fn === OPS.setFillRGBColor) {
      currentColor = `rgb(${args[0] as number}, ${args[1] as number}, ${args[2] as number})`;
    } else if (fn === OPS.setFillGray) {
      const g = Math.floor((args[0] as number) * 255);
      currentColor = `rgb(${g}, ${g}, ${g})`;
    } else if (fn === OPS.setFillCMYKColor) {
      const c = args[0] as number,
        m = args[1] as number,
        y = args[2] as number,
        k = args[3] as number;
      const r = Math.floor(255 * (1 - c) * (1 - k));
      const g = Math.floor(255 * (1 - m) * (1 - k));
      const b = Math.floor(255 * (1 - y) * (1 - k));
      currentColor = `rgb(${r}, ${g}, ${b})`;
    } else if (fn === OPS.showText || fn === OPS.showSpacedText) {
      const opText =
        fn === OPS.showText
          ? args[0]
          : (args[0] as (string | number)[])
              .map((x) => (typeof x === "string" ? x : ""))
              .join("");
      if (opText === textStr) {
        return currentColor;
      }
    }
  }

  return currentColor;
}
