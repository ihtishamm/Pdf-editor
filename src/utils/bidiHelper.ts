import bidiFactory from "bidi-js";

const bidi = bidiFactory();

/**
 * Checks if a string contains any RTL characters (Arabic, Urdu, Hebrew).
 */
export function isRTL(text: string): boolean {
  // Unicode ranges:
  // Arabic & Urdu: U+0600–U+06FF, U+0750–U+077F
  // Hebrew: U+0590–U+05FF
  const rtlRegex = /[\u0600-\u06FF\u0750-\u077F\u0590-\u05FF]/;
  return rtlRegex.test(text);
}

/**
 * Converts a logical-order string to visual-order if it contains RTL characters.
 */
export function getVisualOrder(text: string): string {
  if (!isRTL(text)) return text;

  const embeddingLevels = bidi.getEmbeddingLevels(text);
  const flips = bidi.getReorderSegments(text, embeddingLevels);

  const chars = text.split("");
  for (const [start, end] of flips) {
    const segment = chars.slice(start, end + 1).reverse();
    chars.splice(start, segment.length, ...segment);
  }

  return chars.join("");
}
