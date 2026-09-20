import {
  markdownConvertSchema,
} from "@/lib/services/markdown/markdown.schema";
import { convertMarkdown } from "@/lib/services/markdown/markdown.service";
import type { ApiEnvelope } from "@/types/api";
import { getClientIp, rateKey, withRateLimit } from "@/lib/security/rateLimit";

/** Thin controller: validate → one service call → standard envelope. */
async function handlePOST(request: Request) {
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

/** P6: conversions are public — 120/hour per IP (LibreOffice is the costliest op). */
export const POST = withRateLimit(
  [{ windowSec: 3600, max: 120 }],
  (request: Request) => rateKey(["convert", getClientIp(request)]),
  handlePOST,
);
