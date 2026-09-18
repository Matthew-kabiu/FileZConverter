import { PDFDocument } from "pdf-lib";

/** Merges 2–20 PDFs in order. Pure pdf-lib, no disk touch. */
export async function mergePdfs(buffers: Uint8Array[]): Promise<Uint8Array> {
  const merged = await PDFDocument.create();
  for (const bytes of buffers) {
    const src = await PDFDocument.load(bytes, { ignoreEncryption: false });
    const pages = await merged.copyPages(src, src.getPageIndices());
    for (const page of pages) merged.addPage(page);
  }
  const out = await merged.save();
  return new Uint8Array(out);
}

/**
 * Extracts 1-based pages into a new PDF. Out-of-range pages throw
 * (mapped to VALIDATION_ERROR at the route).
 */
export async function splitPdf(
  buffer: Uint8Array,
  pages: number[],
): Promise<Uint8Array> {
  const src = await PDFDocument.load(buffer, { ignoreEncryption: false });
  const count = src.getPageCount();
  if (pages.length === 0) {
    throw new Error("No pages selected");
  }
  for (const p of pages) {
    if (!Number.isInteger(p) || p < 1 || p > count) {
      throw new Error(`Page out of range: ${p} (document has ${count})`);
    }
  }
  const out = await PDFDocument.create();
  const copied = await out.copyPages(
    src,
    pages.map((p) => p - 1),
  );
  for (const page of copied) out.addPage(page);
  const bytes = await out.save();
  return new Uint8Array(bytes);
}
