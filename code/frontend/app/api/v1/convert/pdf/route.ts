import {
  MAX_FILE_BYTES,
} from "@/lib/services/convert/document.schema";
import { mergePdfs, splitPdf } from "@/lib/services/pdf/pdf.service";
import type { ApiEnvelope } from "@/types/api";
import { getClientIp, rateKey, withRateLimit } from "@/lib/security/rateLimit";

const MAX_FILES = 20;

function envelope(error: string, status: number): Response {
  const body: ApiEnvelope<null> = { success: false, data: null, error };
  return Response.json(body, { status });
}

async function readPdfFiles(form: FormData): Promise<File[] | null> {
  const files = form.getAll("files").filter((f) => f instanceof File) as File[];
  if (files.length < 2 || files.length > MAX_FILES) return null;
  for (const file of files) {
    if (file.size === 0 || file.size > MAX_FILE_BYTES) return null;
    const ext = (file.name.split(".").pop() ?? "").toLowerCase();
    if (ext !== "pdf") return null;
  }
  return files;
}

function download(bytes: Uint8Array, filename: string): Response {
  const body = Uint8Array.from(bytes);
  return new Response(body.buffer as ArrayBuffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

/** Thin controller: 2–20 PDFs in → one merged PDF out. */
async function handlePOST(request: Request) {
  const url = new URL(request.url);
  const mode = url.searchParams.get("mode") ?? "merge";

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return envelope("VALIDATION_ERROR", 400);
  }

  try {
    if (mode === "split") {
      const single = form.get("file");
      if (!(single instanceof File) || single.size === 0) {
        return envelope("VALIDATION_ERROR", 400);
      }
      let pages: unknown;
      try {
        pages = JSON.parse(String(form.get("pages") ?? "[]"));
      } catch {
        return envelope("VALIDATION_ERROR", 400);
      }
      if (
        !Array.isArray(pages) ||
        pages.length === 0 ||
        pages.length > 500 ||
        !pages.every((p) => Number.isInteger(p) && p > 0)
      ) {
        return envelope("VALIDATION_ERROR", 400);
      }
      const out = await splitPdf(
        new Uint8Array(await single.arrayBuffer()),
        pages,
      );
      return download(out, "split.pdf");
    }

    const files = await readPdfFiles(form);
    if (!files) return envelope("VALIDATION_ERROR", 400);
    const buffers = await Promise.all(
      files.map(async (f) => new Uint8Array(await f.arrayBuffer())),
    );
    const out = await mergePdfs(buffers);
    return download(out, "merged.pdf");
  } catch (err) {
    if (process.env.NODE_ENV !== "production") console.error(err);
    const message = err instanceof Error ? err.message : "";
    if (message.startsWith("Page out of range")) {
      return envelope("VALIDATION_ERROR", 400);
    }
    return envelope("UNKNOWN_ERROR", 500);
  }
}

/** P6: conversions are public — 120/hour per IP (LibreOffice is the costliest op). */
export const POST = withRateLimit(
  [{ windowSec: 3600, max: 120 }],
  (request: Request) => rateKey(["convert", getClientIp(request)]),
  handlePOST,
);
