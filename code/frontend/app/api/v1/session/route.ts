import {
  purgeSession,
  sweepStaleSessions,
} from "@/lib/services/files/sessionFiles";
import type { ApiEnvelope } from "@/types/api";

/**
 * Manual delete (privacy terms): purges one session's server tmp.
 * Beacon-friendly — accepts query param, no body needed.
 */
export async function DELETE(request: Request) {
  const url = new URL(request.url);
  const sessionId = url.searchParams.get("sessionId");
  sweepStaleSessions().catch(() => undefined);
  const purged = sessionId ? await purgeSession(sessionId) : false;
  const body: ApiEnvelope<{ purged: boolean }> = {
    success: true,
    data: { purged },
  };
  return Response.json(body);
}
