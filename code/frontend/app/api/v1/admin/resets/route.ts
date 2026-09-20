import { z } from "zod";
import { ensureAuthSchema } from "@/lib/auth/auth";
import { requireAdmin } from "@/lib/auth/session";
import { issueResetToken } from "@/lib/auth/reset";
import type { ApiEnvelope } from "@/types/api";
import { getClientIp, rateKey, withRateLimit } from "@/lib/security/rateLimit";
import { getSession } from "@/lib/auth/session";

const issueSchema = z.object({ userId: z.string().min(1).max(128) });

function parseOrigin(value: string | null): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? url.origin : null;
  } catch {
    return null;
  }
}

/** Preserve the browser-facing host when Next.js is behind a reverse proxy. */
function getRequestOrigin(request: Request): string {
  const browserOrigin = parseOrigin(request.headers.get("origin"));
  if (browserOrigin) return browserOrigin;

  const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  const forwardedProto = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  if (forwardedHost && (forwardedProto === "http" || forwardedProto === "https")) {
    const forwardedOrigin = parseOrigin(`${forwardedProto}://${forwardedHost}`);
    if (forwardedOrigin) return forwardedOrigin;
  }

  return new URL(request.url).origin;
}

/**
 * Admin: issue an Option-B reset link. Returns the ONE-TIME raw token —
 * the admin hands it to the user out-of-band (delivery channel is the
 * trust boundary). Only the SHA-256 hash is stored.
 */
async function handlePOST(request: Request): Promise<Response> {
  await ensureAuthSchema();
  try {
    await requireAdmin();
  } catch {
    const body: ApiEnvelope<null> = {
      success: false,
      data: null,
      error: "forbidden",
    };
    return Response.json(body, { status: 403 });
  }
  let input: z.infer<typeof issueSchema>;
  try {
    input = issueSchema.parse(await request.json());
  } catch {
    const body: ApiEnvelope<null> = {
      success: false,
      data: null,
      error: "{userId} required",
    };
    return Response.json(body, { status: 400 });
  }
  const token = await issueResetToken(input.userId);
  const resetUrl = new URL("/reset", getRequestOrigin(request));
  resetUrl.searchParams.set("token", token);
  const body: ApiEnvelope<{ resetUrl: string; expiresMinutes: number }> = {
    success: true,
    data: { resetUrl: resetUrl.toString(), expiresMinutes: 30 },
  };
  return Response.json(body, { status: 201 });
}

export const POST = withRateLimit(
  [{ windowSec: 3600, max: 10 }],
  async (request: Request) => { const s = await getSession().catch(() => null); return s ? rateKey(["admin-resets", "user", s.user.id]) : rateKey(["admin-resets", "ip", getClientIp(request)]); },
  handlePOST,
);
