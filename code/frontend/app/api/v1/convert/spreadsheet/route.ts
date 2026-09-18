import { z } from "zod";
import {
  MAX_FILE_BYTES,
} from "@/lib/services/convert/document.schema";
import { editWorkbook } from "@/lib/services/spreadsheet/spreadsheet.service";
import type { ApiEnvelope } from "@/types/api";

const editOpSchema = z.object({
  sheet: z.union([z.string().min(1).max(64), z.number().int().min(1)]),
  cell: z
    .string()
    .regex(/^[A-Z]{1,3}[1-9][0-9]{0,6}$/),
  value: z.union([z.string().max(32767), z.number(), z.boolean(), z.null()]),
});

const editsSchema = z.array(editOpSchema).min(1).max(500);

function envelope(error: string, status: number): Response {
  const body: ApiEnvelope<null> = { success: false, data: null, error };
  return Response.json(body, { status });
}

/**
 * Thin controller: multipart .xlsx + JSON cell edits in → edited .xlsx out.
 * Edit-only lane endpoint; format conversion lives in /convert/document.
 */
export async function POST(request: Request) {
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
  if (ext !== "xlsx") return envelope("VALIDATION_ERROR", 400);

  let rawEdits: unknown;
  try {
    rawEdits = JSON.parse(String(form.get("edits") ?? "[]"));
  } catch {
    return envelope("VALIDATION_ERROR", 400);
  }
  const edits = editsSchema.safeParse(rawEdits);
  if (!edits.success) return envelope("VALIDATION_ERROR", 400);

  try {
    const out = await editWorkbook(
      new Uint8Array(await file.arrayBuffer()),
      edits.data,
    );
    const body = Uint8Array.from(out);
    const stem = file.name.replace(/\.xlsx$/i, "");
    return new Response(body.buffer as ArrayBuffer, {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${stem}-edited.xlsx"`,
      },
    });
  } catch (err) {
    if (process.env.NODE_ENV !== "production") console.error(err);
    const message = err instanceof Error ? err.message : "";
    if (message.startsWith("Worksheet not found")) {
      return envelope("VALIDATION_ERROR", 400);
    }
    return envelope("UNKNOWN_ERROR", 500);
  }
}
