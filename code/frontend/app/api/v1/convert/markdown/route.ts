import {
  markdownConvertSchema,
} from "@/lib/services/markdown/markdown.schema";
import { convertMarkdown } from "@/lib/services/markdown/markdown.service";
import type { ApiEnvelope } from "@/types/api";

/** Thin controller: validate → one service call → standard envelope. */
export async function POST(request: Request) {
  const raw = (await request.json().catch(() => null)) as unknown;
  const parsed = markdownConvertSchema.safeParse(raw);

  if (!parsed.success) {
    const body: ApiEnvelope<null> = {
      success: false,
      data: null,
      error: "VALIDATION_ERROR",
    };
    return Response.json(body, { status: 400 });
  }

  const result = await convertMarkdown(parsed.data);
  const body: ApiEnvelope<typeof result> = { success: true, data: result };
  return Response.json(body);
}
