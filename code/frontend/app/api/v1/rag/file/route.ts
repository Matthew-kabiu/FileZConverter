import { z } from "zod";
import { ensureAuthSchema } from "@/lib/auth/auth";
import { requireUser } from "@/lib/auth/session";
import { deleteSessionFile } from "@/lib/ai/rag";
import type { ApiEnvelope } from "@/types/api";
import { getClientIp, rateKey, withRateLimit } from "@/lib/security/rateLimit";
import { getSession } from "@/lib/auth/session";

const SESSION_ID = /^[A-Za-z0-9_-]{1,64}$/;
const STUDIOS = ["markdown", "word", "spreadsheet", "pdf"] as const;

const querySchema = z.object({
  sessionId: z.string().regex(SESSION_ID),
  studio: z.enum(STUDIOS),
  fileName: z.string().min(1).max(255),
});

/** Delete one file's vectors (?sessionId=&studio=&fileName=) — studio file-removal path. */
async function handleDELETE(request: Request): Promise<Response> {
  await ensureAuthSchema();
  let userId: string;
  try {
    userId = (await requireUser()).user.id;
  } catch {
    const body: ApiEnvelope<null> = { success: false, data: null, error: "unauthorized" };
    return Response.json(body, { status: 401 });
  }
  const params = new URL(request.url).searchParams;
  const parsed = querySchema.safeParse({
    sessionId: params.get("sessionId") ?? "",
    studio: params.get("studio") ?? "",
    fileName: params.get("fileName") ?? "",
  });
  if (!parsed.success) {
    const body: ApiEnvelope<null> = { success: false, data: null, error: "invalid file reference" };
    return Response.json(body, { status: 400 });
  }
  try {
    const deleted = await deleteSessionFile({ userId, ...parsed.data });
    const body: ApiEnvelope<{ deleted: number }> = { success: true, data: { deleted } };
    return Response.json(body);
  } catch {
    const body: ApiEnvelope<null> = { success: false, data: null, error: "store unavailable" };
    return Response.json(body, { status: 500 });
  }
}

export const DELETE = withRateLimit(
  [{ windowSec: 3600, max: 60 }],
  async (request: Request) => { const s = await getSession().catch(() => null); return s ? rateKey(["rag-file", "user", s.user.id]) : rateKey(["rag-file", "ip", getClientIp(request)]); },
  handleDELETE,
);
