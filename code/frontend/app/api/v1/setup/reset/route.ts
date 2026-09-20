import { z } from "zod";
import { ensureAuthSchema } from "@/lib/auth/auth";
import { redeemResetToken } from "@/lib/auth/reset";
import type { ApiEnvelope } from "@/types/api";
import { getClientIp, rateKey, withRateLimit } from "@/lib/security/rateLimit";

const redeemSchema = z.object({
  token: z.string().min(1).max(256),
  password: z.string().min(12).max(256),
});

/**
 * Public reset redemption. Oracle-free: unknown, expired, and used tokens
 * all return the same generic success — callers can't probe token validity.
 * (P6 rate-limits this endpoint at 5/hour/IP.)
 */
async function handlePOST(request: Request): Promise<Response> {
  await ensureAuthSchema();
  let input: z.infer<typeof redeemSchema>;
  try {
    input = redeemSchema.parse(await request.json());
  } catch {
    const body: ApiEnvelope<null> = {
      success: false,
      data: null,
      error: "token and password (min 12 chars) required",
    };
    return Response.json(body, { status: 400 });
  }
  await redeemResetToken(input.token, input.password);
  const body: ApiEnvelope<{ done: boolean }> = {
    success: true,
    data: { done: true },
  };
  return Response.json(body);
}

export const POST = withRateLimit(
  [{ windowSec: 3600, max: 5 }],
  (request: Request) => rateKey(["reset-redeem", getClientIp(request)]),
  handlePOST,
);
