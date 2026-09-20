import { z } from "zod";
import { ensureAuthSchema } from "@/lib/auth/auth";
import { requireUser } from "@/lib/auth/session";
import { getAiPrefs, setAiPrefs } from "@/lib/ai/prefs";
import type { ApiEnvelope } from "@/types/api";
import { getClientIp, rateKey, withRateLimit } from "@/lib/security/rateLimit";
import { getSession } from "@/lib/auth/session";

const prefsSchema = z.object({
  chatProvider: z.string().max(32).nullable().optional(),
  chatModel: z.string().max(128).nullable().optional(),
  embedProvider: z.string().max(32).nullable().optional(),
  embedModel: z.string().max(128).nullable().optional(),
});

/** Read effective model prefs (user picks over env defaults). */
async function handleGET(): Promise<Response> {
  await ensureAuthSchema();
  let userId: string;
  try {
    userId = (await requireUser()).user.id;
  } catch {
    const body: ApiEnvelope<null> = { success: false, data: null, error: "unauthorized" };
    return Response.json(body, { status: 401 });
  }
  const body: ApiEnvelope<ReturnType<typeof getAiPrefs>> = {
    success: true,
    data: getAiPrefs(userId),
  };
  return Response.json(body);
}

/** Save model prefs. Provider availability is enforced at use time. */
async function handlePUT(request: Request): Promise<Response> {
  await ensureAuthSchema();
  let userId: string;
  try {
    userId = (await requireUser()).user.id;
  } catch {
    const body: ApiEnvelope<null> = { success: false, data: null, error: "unauthorized" };
    return Response.json(body, { status: 401 });
  }
  let input: z.infer<typeof prefsSchema>;
  try {
    input = prefsSchema.parse(await request.json());
  } catch {
    const body: ApiEnvelope<null> = { success: false, data: null, error: "invalid prefs" };
    return Response.json(body, { status: 400 });
  }
  const body: ApiEnvelope<ReturnType<typeof setAiPrefs>> = {
    success: true,
    data: setAiPrefs(userId, input),
  };
  return Response.json(body);
}

export const GET = withRateLimit(
  [{ windowSec: 3600, max: 100 }],
  async (request: Request) => { const s = await getSession().catch(() => null); return s ? rateKey(["setup-prefs", "user", s.user.id]) : rateKey(["setup-prefs", "ip", getClientIp(request)]); },
  handleGET,
);

export const PUT = withRateLimit(
  [{ windowSec: 3600, max: 30 }],
  async (request: Request) => { const s = await getSession().catch(() => null); return s ? rateKey(["setup-prefs", "user", s.user.id]) : rateKey(["setup-prefs", "ip", getClientIp(request)]); },
  handlePUT,
);
