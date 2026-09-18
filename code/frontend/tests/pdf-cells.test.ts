import { PDFDocument } from "pdf-lib";
import { describe, expect, it } from "vitest";
import { mergePdfs, splitPdf } from "@/lib/services/pdf/pdf.service";
import { convertDocument } from "@/lib/services/convert/document.service";

async function onePagePdf(): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.addPage([600, 400]);
  return new Uint8Array(await doc.save());
}

async function pageCount(bytes: Uint8Array): Promise<number> {
  return (await PDFDocument.load(bytes)).getPageCount();
}

describe("pdf merge/split (pdf-lib)", () => {
  it("merges in order", async () => {
    const merged = await mergePdfs([await onePagePdf(), await onePagePdf()]);
    expect(await pageCount(merged)).toBe(2);
  });

  it("splits selected pages and rejects out-of-range", async () => {
    const merged = await mergePdfs([await onePagePdf(), await onePagePdf()]);
    const part = await splitPdf(merged, [2]);
    expect(await pageCount(part)).toBe(1);
    await expect(splitPdf(merged, [3])).rejects.toThrow("Page out of range");
    await expect(splitPdf(merged, [])).rejects.toThrow();
  });
});

describe("pdf→txt via poppler", () => {
  it(
    "extracts text from a converted pdf",
    async () => {
      const pdf = await convertDocument({
        sessionId: "test-pdf-src",
        filename: "report.md",
        bytes: new TextEncoder().encode("# Extract Me\n\nBody text here."),
        from: "md",
        target: "pdf",
      });
      const txt = await convertDocument({
        sessionId: "test-pdf-txt",
        filename: pdf.filename,
        bytes: pdf.bytes,
        from: "pdf",
        target: "txt",
      });
      const text = new TextDecoder().decode(txt.bytes);
      expect(text).toContain("Extract Me");
      expect(text).toContain("Body text here.");
    },
    120_000,
  );
});
