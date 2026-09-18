import {
  documentInputExtSchema,
  documentTargetSchema,
  MAX_FILE_BYTES,
} from "@/lib/services/convert/document.schema";
import { convertDocument } from "@/lib/services/convert/document.service";
import type { ApiEnvelope } from "@/types/api";

function envelope(
  error: string,
  status: number,
): Response {
  const body: ApiEnvelope<null> = { success: false, data: null, error };
  return Response.json(body, { status });
}

/** Thin controller: multipart file in → converted file out (download). */
export async function POST(request: Request) {
  const url = new URL(request.url);
  const target = documentTargetSchema.safeParse(url.searchParams.get("target"));
  if (!target.success) return envelope("VALIDATION_ERROR", 400);

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return envelope("VALIDATION_ERROR", 400);
  }

  const file = form.get("file");
  if (!(file instanceof File)) return envelope("VALIDATION_ERROR", 400);
  if (file.size === 0 || file.size > MAX_FILE_BYTES) {
    return envelope("VALIDATION_ERROR", 400);
  }

  const ext = (file.name.split(".").pop() ?? "").toLowerCase();
  const from = documentInputExtSchema.safeParse(ext);
  if (!from.success) return envelope("VALIDATION_ERROR", 400);

  try {
    const result = await convertDocument({
      sessionId: url.searchParams.get("sessionId"),
      filename: file.name,
      bytes: new Uint8Array(await file.arrayBuffer()),
      from: from.data,
      target: target.data,
    });
    // Copy: some engines return pooled buffers whose .buffer is oversized.
    const body = Uint8Array.from(result.bytes);
    return new Response(body.buffer as ArrayBuffer, {
      headers: {
        "Content-Type": result.contentType,
        "Content-Disposition": `attachment; filename="${result.filename}"`,
      },
    });
  } catch (err) {
    if (process.env.NODE_ENV !== "production") console.error(err);
    const message = err instanceof Error ? err.message : "";
    if (message.startsWith("Conversion from")) {
      return envelope("VALIDATION_ERROR", 400);
    }
    return envelope("UNKNOWN_ERROR", 500);
  }
}
