import { readFile } from "node:fs/promises";
import TurndownService from "turndown";
import {
  markdownToDocxBuffer,
  markdownToHtml,
  markdownToPlainText,
  plainTextToMarkdown,
} from "@/lib/services/markdown/markdown.service";
import {
  CONTENT_TYPES,
  DOCUMENT_MATRIX,
  type DocumentInputExt,
} from "@/lib/services/convert/document.schema";
import {
  csvToXlsx,
  xlsxToCsv,
} from "@/lib/services/spreadsheet/spreadsheet.service";
import {
  convertWithLibreOffice,
  type LibreOutput,
} from "@/lib/services/convert/libreoffice";
import { extractPdfText } from "@/lib/services/convert/pdftext";
import {
  getSessionDir,
  purgeSession,
  resolveSessionId,
  sweepStaleSessions,
  writeSessionInput,
} from "@/lib/services/files/sessionFiles";

export interface DocumentConversion {
  bytes: Uint8Array;
  filename: string;
  contentType: string;
}

const turndown = new TurndownService();

/**
 * LibreOffice HTML carries a full <style> block (page CSS) that turndown
 * would otherwise convert into visible garbage text. Strip head/style/
 * script/comments before Markdown conversion. Regex on purpose: no DOM
 * library on the server path.
 */
export function cleanHtmlForMarkdown(html: string): string {
  return html
    .replace(/<head[\s\S]*?<\/head>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "");
}

function stemOf(filename: string): string {
  const base = filename.split("/").pop() ?? "converted";
  const dot = base.lastIndexOf(".");
  return (dot > 0 ? base.slice(0, dot) : base).replace(
    /[^A-Za-z0-9_-]+/g,
    "_",
  );
}

/**
 * File conversion orchestration. Pure engines only, no framework imports.
 * Tmp is ALWAYS purged after the response bytes are read — zero retention.
 */
export async function convertDocument(args: {
  sessionId: unknown;
  filename: string;
  bytes: Uint8Array;
  from: DocumentInputExt;
  target: string;
}): Promise<DocumentConversion> {
  const allowed = DOCUMENT_MATRIX[args.from] as readonly string[];
  if (!allowed.includes(args.target)) {
    throw new Error(
      `Conversion from ${args.from} to ${args.target} is not supported.`,
    );
  }

  const sessionId = resolveSessionId(args.sessionId);
  // Sweep orphans on every conversion (covers close-without-beacon).
  sweepStaleSessions().catch(() => undefined);
  const dir = await getSessionDir(sessionId);
  const stem = stemOf(args.filename);
  const outName = `${stem}.${args.target}`;

  try {
    const bytes = await convertToTarget(dir, args);
    return {
      bytes,
      filename: outName,
      contentType: CONTENT_TYPES[args.target] ?? "application/octet-stream",
    };
  } finally {
    await purgeSession(sessionId);
  }
}

async function convertToTarget(
  dir: string,
  args: { filename: string; bytes: Uint8Array; from: DocumentInputExt; target: string },
): Promise<Uint8Array> {
  const { from, target } = args;
  const text = () => new TextDecoder().decode(args.bytes);
  const encode = (s: string) => new TextEncoder().encode(s);

  // In-process cells (no disk touch).
  if (from === "md" && target === "html") return encode(await markdownToHtml(text()));
  if (from === "md" && target === "txt") return encode(markdownToPlainText(text()));
  if (from === "txt" && target === "md") return encode(plainTextToMarkdown(text()));
  if (from === "html" && target === "md") {
    return encode(turndown.turndown(cleanHtmlForMarkdown(text())));
  }
  if (from === "md" && target === "docx") {
    return new Uint8Array(await markdownToDocxBuffer(text()));
  }

  // Spreadsheet cells (in-process via exceljs).
  if (from === "xlsx" && target === "csv") {
    return new TextEncoder().encode(await xlsxToCsv(args.bytes));
  }
  if (from === "csv" && target === "xlsx") {
    return new Uint8Array(await csvToXlsx(text()));
  }

  // PDF text extraction (poppler — approved engine, no disk residue:
  // output is read straight back; session dir purged by caller).
  if (from === "pdf" && target === "txt") {
    const inputPath = await writeSessionInput(
      dir.split("/").pop() ?? "session",
      ".pdf",
      args.bytes,
    );
    return encode(await extractPdfText(inputPath, dir));
  }

  // LibreOffice cells (disk touch inside session tmp only). soffice has no
  // markdown writer, so md targets convert via html + turndown.
  const inputPath = await writeSessionInput(
    dir.split("/").pop() ?? "session",
    `.${from}`,
    args.bytes,
  );
  const sofficeTarget = (target === "md" ? "html" : target) as LibreOutput;
  const outPath = await convertWithLibreOffice(inputPath, dir, sofficeTarget);
  let output = await readFile(/*turbopackIgnore: true*/ outPath);
  if (target === "md") {
    // docx/html → soffice html → turndown → md.
    const html = await readFile(/*turbopackIgnore: true*/ outPath, "utf8");
    output = Buffer.from(turndown.turndown(cleanHtmlForMarkdown(html)));
  }
  return new Uint8Array(output);
}
