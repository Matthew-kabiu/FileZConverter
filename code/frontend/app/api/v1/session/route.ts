import {
  purgeSession,
  sweepStaleSessions,
} from "@/lib/services/files/sessionFiles";
import type { ApiEnvelope } from "@/types/api";
import { getClientIp, rateKey, withRateLimit } from "@/lib/security/rateLimit";

const SESSION_ID = /^[A-Za-z0-9_-]{1,64}$/;

/**
 * Manual delete (privacy terms): purges one session's server tmp AND its RAG
 * vectors across every account that session id appears under (session ids
 * are uuid-random, so a global key scan is safe). Beacon-friendly — accepts
 * query param, no body needed. RAG failures never block tmp purge.
 */
async function handleDELETE(request: Request) {
  const url = new URL(request.url);
  const sessionId = url.searchParams.get("sessionId");
  sweepStaleSessions().catch(() => undefined);
  const purged = sessionId ? await purgeSession(sessionId) : false;
  let vectorsDeleted = 0;
  if (sessionId && SESSION_ID.test(sessionId)) {
    try {
      const { getRedis } = await import("@/lib/ai/redis");
      const r = await getRedis();
      const batch: string[] = [];
      for await (const keys of r.scanIterator({ MATCH: `rag:*:${sessionId}:*`, COUNT: 200 })) {
        for (const key of keys) {
          batch.push(key);
          if (batch.length >= 100) {
            vectorsDeleted += await r.del(batch.splice(0));
          }
        }
      }
      if (batch.length > 0) vectorsDeleted += await r.del(batch);
    } catch {
      // Redis down — tmp purge already succeeded; TTLs cover orphans.
    }
  }
  const body: ApiEnvelope<{ purged: boolean; vectorsDeleted: number }> = {
    success: true,
    data: { purged, vectorsDeleted },
  };
  return Response.json(body);
}

export const DELETE = withRateLimit(
  [{ windowSec: 3600, max: 60 }],
  (request: Request) => rateKey(["session-purge", getClientIp(request)]),
  handleDELETE,
);
