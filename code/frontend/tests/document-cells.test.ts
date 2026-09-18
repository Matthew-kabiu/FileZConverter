import { describe, expect, it } from "vitest";
import {
  markdownToDocxBuffer,
  markdownToHtml,
} from "@/lib/services/markdown/markdown.service";
import { convertDocument } from "@/lib/services/convert/document.service";
import {
  getSessionDir,
  purgeSession,
} from "@/lib/services/files/sessionFiles";
import { stat } from "node:fs/promises";

const MD = "# Report\n\nSome **bold** text and a list:\n\n- one\n- two\n";

describe("markdown html/docx cells", () => {
  it("md→html contains the heading", async () => {
    expect(await markdownToHtml(MD)).toContain("<h1>Report</h1>");
  });

  it("md→docx renders tables as real docx tables", async () => {
    const buf = await markdownToDocxBuffer(
      "# T\n\n| name | qty |\n| --- | --- |\n| apples | 3 |\n",
    );
    expect(buf.length).toBeGreaterThan(1000);
    // .docx is a zip — inspect word/document.xml for real table markup.
    const { execFile } = await import("node:child_process");
    const { promisify } = await import("node:util");
    const { mkdtemp, writeFile } = await import("node:fs/promises");
    const { tmpdir } = await import("node:os");
    const { join } = await import("node:path");
    const dir = await mkdtemp(join(tmpdir(), "filez-docx-"));
    await writeFile(join(dir, "t.docx"), buf);
    const { stdout } = await promisify(execFile)("unzip", [
      "-p",
      join(dir, "t.docx"),
      "word/document.xml",
    ]);
    expect(stdout).toContain("<w:tbl>");
    expect(stdout).toContain("apples");
    expect(stdout).not.toContain("apples\t3");
  });
});

describe("session tmp zero-retention", () => {
  it("purge removes the session dir", async () => {
    const dir = await getSessionDir("test-purge-session");
    await expect(stat(dir)).resolves.toBeDefined();
    expect(await purgeSession("test-purge-session")).toBe(true);
    await expect(stat(dir)).rejects.toThrow();
  });
});

describe("libreoffice cells (integration — needs soffice)", () => {
  it(
    "md→pdf produces %PDF bytes",
    async () => {
      const out = await convertDocument({
        sessionId: "test-md-pdf",
        filename: "report.md",
        bytes: new TextEncoder().encode(MD),
        from: "md",
        target: "pdf",
      });
      expect(out.contentType).toBe("application/pdf");
      expect(out.filename).toBe("report.pdf");
      const head = new TextDecoder().decode(out.bytes.slice(0, 5));
      expect(head).toBe("%PDF-");
    },
    90_000,
  );

  it(
    "md→docx→md round-trips the heading text",
    async () => {
      const docx = await convertDocument({
        sessionId: "test-md-docx",
        filename: "report.md",
        bytes: new TextEncoder().encode(MD),
        from: "md",
        target: "docx",
      });
      expect(docx.contentType).toContain("wordprocessingml");
      const back = await convertDocument({
        sessionId: "test-docx-md",
        filename: docx.filename,
        bytes: docx.bytes,
        from: "docx",
        target: "md",
      });
      expect(back.contentType).toBe("text/markdown");
      const text = new TextDecoder().decode(back.bytes);
      expect(text).toContain("Report");
      expect(text).toContain("bold");
      // LibreOffice style blocks must never leak into Markdown output.
      expect(text).not.toContain("@page");
      expect(text).not.toContain("{ size:");
    },
    120_000,
  );

  it(
    "docx→txt/html/pdf cells all produce output",
    async () => {
      const docx = await convertDocument({
        sessionId: "test-docx-cells",
        filename: "report.md",
        bytes: new TextEncoder().encode(MD),
        from: "md",
        target: "docx",
      });
      for (const target of ["txt", "html", "pdf"] as const) {
        const out = await convertDocument({
          sessionId: `test-docx-${target}`,
          filename: docx.filename,
          bytes: docx.bytes,
          from: "docx",
          target,
        });
        expect(out.bytes.length).toBeGreaterThan(0);
      }
      const txt = await convertDocument({
        sessionId: "test-docx-txt",
        filename: docx.filename,
        bytes: docx.bytes,
        from: "docx",
        target: "txt",
      });
      expect(new TextDecoder().decode(txt.bytes)).toContain("Report");
    },
    180_000,
  );

  it(
    "round-trip edit: docx→md→edit→docx carries the edit",
    async () => {
      const v1 = await convertDocument({
        sessionId: "test-edit-v1",
        filename: "note.md",
        bytes: new TextEncoder().encode("# Note\n\nOriginal text here."),
        from: "md",
        target: "docx",
      });
      const asMd = await convertDocument({
        sessionId: "test-edit-md",
        filename: v1.filename,
        bytes: v1.bytes,
        from: "docx",
        target: "md",
      });
      const edited = new TextDecoder()
        .decode(asMd.bytes)
        .replace("Original", "Edited");
      expect(edited).toContain("Edited");
      const v2 = await convertDocument({
        sessionId: "test-edit-v2",
        filename: "note.md",
        bytes: new TextEncoder().encode(edited),
        from: "md",
        target: "docx",
      });
      expect(v2.bytes.length).toBeGreaterThan(1000);
      const back = await convertDocument({
        sessionId: "test-edit-back",
        filename: v2.filename,
        bytes: v2.bytes,
        from: "docx",
        target: "txt",
      });
      expect(new TextDecoder().decode(back.bytes)).toContain("Edited");
    },
    180_000,
  );
});
