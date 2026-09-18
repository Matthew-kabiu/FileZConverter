"use client";

import { marked } from "marked";
import TurndownService from "turndown";
import {
  markdownToPlainText,
  plainTextToMarkdown,
} from "@/lib/services/markdown/plaintext";

/**
 * Browser-side conversions (privacy terms: client-first where JS engines
 * suffice). Only marked + turndown + dependency-free text fns are imported
 * here — never docx/exceljs/pdf-lib, so the client bundle stays small.
 * Everything else runs server-side with per-action notice.
 */
const turndown = new TurndownService();

export type ClientTarget = "txt" | "md" | "html";

const CLIENT_CELLS: Record<string, readonly ClientTarget[]> = {
  md: ["txt", "html"],
  txt: ["md"],
  html: ["md"],
};

export function clientTargetsFor(ext: string): readonly ClientTarget[] {
  return CLIENT_CELLS[ext] ?? [];
}

export async function convertInBrowser(
  text: string,
  from: string,
  target: ClientTarget,
): Promise<string> {
  if (from === "md" && target === "txt") return markdownToPlainText(text);
  if (from === "txt" && target === "md") return plainTextToMarkdown(text);
  if (from === "md" && target === "html") return marked.parse(text);
  if (from === "html" && target === "md") return turndown.turndown(text);
  throw new Error(`No browser cell for ${from} to ${target}`);
}

export function downloadTextFile(
  text: string,
  filename: string,
  mime: string,
): void {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
