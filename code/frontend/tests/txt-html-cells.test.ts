import { describe, expect, it } from "vitest";
import { convertDocument } from "@/lib/services/convert/document.service";

const HTML = "<html><body><h1>Html Check</h1><p>Para text here.</p></body></html>";

describe("txt lane cells", () => {
  it(
    "txt→pdf produces %PDF; txt→md wraps paragraphs",
    async () => {
      const bytes = new TextEncoder().encode("First.\n\nSecond.");
      const pdf = await convertDocument({
        sessionId: "test-txt-pdf",
        filename: "note.txt",
        bytes,
        from: "txt",
        target: "pdf",
      });
      expect(new TextDecoder().decode(pdf.bytes.slice(0, 5))).toBe("%PDF-");
      const md = await convertDocument({
        sessionId: "test-txt-md",
        filename: "note.txt",
        bytes,
        from: "txt",
        target: "md",
      });
      expect(new TextDecoder().decode(md.bytes)).toBe("First.\n\nSecond.");
    },
    120_000,
  );
});

describe("html lane cells", () => {
  it(
    "html→pdf produces %PDF; html→md extracts text",
    async () => {
      const bytes = new TextEncoder().encode(HTML);
      const pdf = await convertDocument({
        sessionId: "test-html-pdf",
        filename: "page.html",
        bytes,
        from: "html",
        target: "pdf",
      });
      expect(new TextDecoder().decode(pdf.bytes.slice(0, 5))).toBe("%PDF-");
      const md = await convertDocument({
        sessionId: "test-html-md",
        filename: "page.html",
        bytes,
        from: "html",
        target: "md",
      });
      const text = new TextDecoder().decode(md.bytes);
      expect(text).toContain("Html Check");
      expect(text).toContain("Para text here.");
    },
    120_000,
  );
});
