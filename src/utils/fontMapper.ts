export type FontInfo = {
  family: string;
  weight: string | number;
  style: string;
};

const fontCache = new Map<string, FontInfo>();

export function mapPdfFont(pdfFontName: string): FontInfo {
  if (fontCache.has(pdfFontName)) return fontCache.get(pdfFontName)!;

  let family = "sans-serif";
  let weight: string | number = "normal";
  let style = "normal";

  const lower = pdfFontName.toLowerCase();

  // Heuristics for weight
  if (lower.includes("bold")) {
    weight = "bold";
  } else if (lower.includes("black")) {
    weight = 900;
  } else if (lower.includes("light")) {
    weight = 300;
  }

  // Heuristics for style
  if (lower.includes("italic") || lower.includes("oblique")) {
    style = "italic";
  }

  // Heuristics for family
  if (
    lower.includes("arial") ||
    lower.includes("helvetica") ||
    lower.includes("gothic")
  ) {
    family = "Arial, Helvetica, sans-serif";
  } else if (
    lower.includes("times") ||
    lower.includes("roman") ||
    lower.includes("minion")
  ) {
    family = '"Times New Roman", Times, serif';
  } else if (lower.includes("courier") || lower.includes("mono")) {
    family = '"Courier New", Courier, monospace';
  }

  const info = { family, weight, style };
  fontCache.set(pdfFontName, info);
  return info;
}
