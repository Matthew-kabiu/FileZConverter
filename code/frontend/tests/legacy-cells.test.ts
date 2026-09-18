import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { convertDocument } from "@/lib/services/convert/document.service";

const execFileAsync = promisify(execFile);

const RTF =
  "{\\rtf1\\ansi\\deff0{\\fonttbl{\\f0 Arial;}}\\f0\\fs24 Legacy report text here.}";

/** Builds .odt / .doc fixtures from our own .docx via soffice (no binaries in repo). */
async function fixtureFromDocx(
  docxBytes: Uint8Array,
  format: "odt" | "doc",
): Promise<{ bytes: Uint8Array; filename: string }> {
  const dir = await mkdtemp(join(tmpdir(), "filez-fixture-"));
  const input = join(dir, "input.docx");
  await writeFile(input, docxBytes);
  await execFileAsync("soffice", [
    "--headless",
    "--convert-to",
    format,
    "--outdir",
    dir,
    input,
  ]);
  const ext = format === "odt" ? "odt" : "doc";
  const bytes = await readFile(join(dir, `input.${ext}`));
  return { bytes: new Uint8Array(bytes), filename: `input.${ext}` };
}

describe("legacy office inputs (via soffice)", () => {
  it(
    "rtf→pdf + rtf→txt",
    async () => {
      const bytes = new TextEncoder().encode(RTF);
      const pdf = await convertDocument({
        sessionId: "test-rtf-pdf",
        filename: "note.rtf",
        bytes,
        from: "rtf",
        target: "pdf",
      });
      expect(new TextDecoder().decode(pdf.bytes.slice(0, 5))).toBe("%PDF-");
      const txt = await convertDocument({
        sessionId: "test-rtf-txt",
        filename: "note.rtf",
        bytes,
        from: "rtf",
        target: "txt",
      });
      expect(new TextDecoder().decode(txt.bytes)).toContain("Legacy report");
    },
    120_000,
  );

  it(
    "odt→pdf + odt→md",
    async () => {
      const docx = await convertDocument({
        sessionId: "test-odt-src",
        filename: "report.md",
        bytes: new TextEncoder().encode("# Legacy Check\n\nOdt content here."),
        from: "md",
        target: "docx",
      });
      const odt = await fixtureFromDocx(docx.bytes, "odt");
      const pdf = await convertDocument({
        sessionId: "test-odt-pdf",
        filename: odt.filename,
        bytes: odt.bytes,
        from: "odt",
        target: "pdf",
      });
      expect(new TextDecoder().decode(pdf.bytes.slice(0, 5))).toBe("%PDF-");
      const md = await convertDocument({
        sessionId: "test-odt-md",
        filename: odt.filename,
        bytes: odt.bytes,
        from: "odt",
        target: "md",
      });
      const text = new TextDecoder().decode(md.bytes);
      expect(text).toContain("Legacy Check");
    },
    180_000,
  );

  it(
    "legacy doc→txt + doc→pdf",
    async () => {
      const docx = await convertDocument({
        sessionId: "test-doc-src",
        filename: "report.md",
        bytes: new TextEncoder().encode("# Legacy Doc\n\nDoc content here."),
        from: "md",
        target: "docx",
      });
      const doc = await fixtureFromDocx(docx.bytes, "doc");
      const txt = await convertDocument({
        sessionId: "test-doc-txt",
        filename: doc.filename,
        bytes: doc.bytes,
        from: "doc",
        target: "txt",
      });
      expect(new TextDecoder().decode(txt.bytes)).toContain("Legacy Doc");
      const pdf = await convertDocument({
        sessionId: "test-doc-pdf",
        filename: doc.filename,
        bytes: doc.bytes,
        from: "doc",
        target: "pdf",
      });
      expect(new TextDecoder().decode(pdf.bytes.slice(0, 5))).toBe("%PDF-");
    },
    180_000,
  );
});
