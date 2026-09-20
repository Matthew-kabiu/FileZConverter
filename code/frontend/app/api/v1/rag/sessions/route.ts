import { ensureAuthSchema } from "@/lib/auth/auth";
import { requireUser } from "@/lib/auth/session";
import { deleteSessionVectors, listUserSessions } from "@/lib/ai/rag";
import type { ApiEnvelope } from "@/types/api";
import { getClientIp, rateKey, withRateLimit } from "@/lib/security/rateLimit";
import { getSession } from "@/lib/auth/session";

const SESSION_ID = /^[A-Za-z0-9_-]{1,64}$/;

/** Per-device view: sessions holding vectors for this user. */
async function handleGET(): Promise<Response> {
  await ensureAuthSchema();
  let userId: string;
  try {
    userId = (await requireUser()).user.id;
  } catch {
    const body: ApiEnvelope<null> = { success: false, data: null, error: "unauthorized" };
    return Response.json(body, { status: 401 });
  }
  try {
    const sessions = await listUserSessions(userId);
    const body: ApiEnvelope<typeof sessions> = { success: true, data: sessions };
    return Response.json(body);
  } catch {
    const body: ApiEnvelope<null> = { success: false, data: null, error: "store unavailable" };
    return Response.json(body, { status: 500 });
  }
}

/** Revoke one device's vectors (?sessionId=) — the "clear chat memory" path. */
async function handleDELETE(request: Request): Promise<Response> {
  await ensureAuthSchema();
  let userId: string;
  try {
    userId = (await requireUser()).user.id;
  } catch {
    const body: ApiEnvelope<null> = { success: false, data: null, error: "unauthorized" };
    return Response.json(body, { status: 401 });
  }
  const sessionId = new URL(request.url).searchParams.get("sessionId") ?? "";
  if (!SESSION_ID.test(sessionId)) {
    const body: ApiEnvelope<null> = { success: false, data: null, error: "invalid sessionId" };
    return Response.json(body, { status: 400 });
  }
  try {
    const deleted = await deleteSessionVectors(userId, sessionId);
    const body: ApiEnvelope<{ deleted: number }> = { success: true, data: { deleted } };
    return Response.json(body);
  } catch {
    const body: ApiEnvelope<null> = { success: false, data: null, error: "store unavailable" };
    return Response.json(body, { status: 500 });
  }
}

export const GET = withRateLimit(
  [{ windowSec: 3600, max: 60 }],
  async (request: Request) => { const s = await getSession().catch(() => null); return s ? rateKey(["rag-sessions", "user", s.user.id]) : rateKey(["rag-sessions", "ip", getClientIp(request)]); },
  handleGET,
);

export const DELETE = withRateLimit(
  [{ windowSec: 3600, max: 60 }],
  async (request: Request) => { const s = await getSession().catch(() => null); return s ? rateKey(["rag-sessions", "user", s.user.id]) : rateKey(["rag-sessions", "ip", getClientIp(request)]); },
  handleDELETE,
);
