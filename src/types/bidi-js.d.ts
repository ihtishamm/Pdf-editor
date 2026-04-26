declare module "bidi-js" {
  export interface EmbeddingLevels {
    levels: Uint8Array;
    paragraphs: { start: number; end: number; level: number }[];
  }

  export interface Bidi {
    getEmbeddingLevels(
      text: string,
      direction?: "ltr" | "rtl" | null,
    ): EmbeddingLevels;
    getReorderSegments(
      text: string,
      embeddingLevels: EmbeddingLevels,
    ): [number, number][];
    getBidiCharTypeName(char: string): string;
  }

  export default function bidiFactory(): Bidi;
}
