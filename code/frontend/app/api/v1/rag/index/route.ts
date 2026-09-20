import { z } from "zod";
import { ensureAuthSchema } from "@/lib/auth/auth";
import { requireUser } from "@/lib/auth/session";
import { AiConfigError } from "@/lib/ai/types";
import { indexDocument } from "@/lib/ai/ingest";
import type { ApiEnvelope } from "@/types/api";
import { getClientIp, rateKey, withRateLimit } from "@/lib/security/rateLimit";
import { getSession } from "@/lib/auth/session";

const STUDIOS = ["markdown", "word", "spreadsheet", "pdf"] as const;
const SESSION_ID = /^[A-Za-z0-9_-]{1,64}$/;

const indexSchema = z.object({
  sessionId: z.string().regex(SESSION_ID),
  studio: z.enum(STUDIOS),
  fileName: z.string().min(1).max(255),
  text: z.string().min(1).max(1_000_000),
});

/**
 * Index a studio document for this browser session. Auth-required (vectors
 * are per-user); anonymous uploads simply skip indexing (hook stays quiet).
 * (P6 rate-limits: 30/hour/user.)
 */
async function handlePOST(request: Request): Promise<Response> {
  await ensureAuthSchema();
  let userId: string;
  try {
    userId = (await requireUser()).user.id;
  } catch {
    const body: ApiEnvelope<null> = { success: false, data: null, error: "unauthorized" };
    return Response.json(body, { status: 401 });
  }
  let input: z.infer<typeof indexSchema>;
  try {
    input = indexSchema.parse(await request.json());
  } catch {
    const body: ApiEnvelope<null> = { success: false, data: null, error: "invalid payload" };
    return Response.json(body, { status: 400 });
  }
  try {
    const result = await indexDocument({ userId, ...input });
    const body: ApiEnvelope<typeof result> = { success: true, data: result };
    return Response.json(body);
  } catch (err) {
    if (err instanceof AiConfigError) {
      const body: ApiEnvelope<null> = { success: false, data: null, error: err.code };
      return Response.json(body, { status: 409 });
    }
    console.error(
      "[rag/index] indexing failed",
      err instanceof Error ? `${err.name}: ${err.message}` : String(err),
    );
    const body: ApiEnvelope<null> = { success: false, data: null, error: "indexing failed" };
    return Response.json(body, { status: 500 });
  }
}

export const POST = withRateLimit(
  [{ windowSec: 3600, max: 30 }],
  async (request: Request) => { const s = await getSession().catch(() => null); return s ? rateKey(["rag-index", "user", s.user.id]) : rateKey(["rag-index", "ip", getClientIp(request)]); },
  handlePOST,
);
