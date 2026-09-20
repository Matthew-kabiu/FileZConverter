import { ensureAuthSchema } from "@/lib/auth/auth";
import { isBootstrapNeeded } from "@/lib/auth/session";
import { getClientIp, rateKey, withRateLimit } from "@/lib/security/rateLimit";
import type { ApiEnvelope } from "@/types/api";

/** Public setup state: drives the setup modal (bootstrap vs sign-in). */
async function handleGET(): Promise<Response> {
  const started = Date.now();
  const mark = (label: string) => {
    if (process.env.NODE_ENV !== "production") {
      console.info(`[setup/status] ${label} +${Date.now() - started}ms`);
    }
  };
  await ensureAuthSchema();
  mark("schema");
  const bootstrapNeeded = await isBootstrapNeeded();
  mark("bootstrap-check");
  const body: ApiEnvelope<{ bootstrapNeeded: boolean }> = {
    success: true,
    data: { bootstrapNeeded },
  };
  return Response.json(body);
}

export const GET = withRateLimit(
  [{ windowSec: 3600, max: 100 }],
  (request: Request) => rateKey(["setup-status", getClientIp(request)]),
  handleGET,
);
