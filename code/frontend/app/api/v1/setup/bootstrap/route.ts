import { z } from "zod";
import { auth, ensureAuthSchema } from "@/lib/auth/auth";
import { isBootstrapNeeded, setBootstrapCache } from "@/lib/auth/session";
import type { ApiEnvelope } from "@/types/api";
import { getClientIp, rateKey, withRateLimit } from "@/lib/security/rateLimit";

const bootstrapSchema = z.object({
  name: z.string().trim().min(1).max(100),
  email: z.string().trim().email().max(255),
  password: z.string().min(12).max(256),
});

/**
 * First-run bootstrap: creates the initial admin account. Open ONLY while no
 * user exists — afterwards every call returns 403 (closed signup). The admin
 * plugin's create-user takes over from here (P2 admin panel).
 */
async function handlePOST(request: Request): Promise<Response> {
  await ensureAuthSchema();
  if (!(await isBootstrapNeeded())) {
    const body: ApiEnvelope<null> = {
      success: false,
      data: null,
      error: "setup already complete",
    };
    return Response.json(body, { status: 403 });
  }
  let input: z.infer<typeof bootstrapSchema>;
  try {
    input = bootstrapSchema.parse(await request.json());
  } catch {
    const body: ApiEnvelope<null> = {
      success: false,
      data: null,
      error: "name, valid email, and password (min 12 chars) required",
    };
    return Response.json(body, { status: 400 });
  }
  const ctx = await auth.$context;
  const hash = await ctx.password.hash(input.password);
  const user = await ctx.internalAdapter.createUser(
    {
      name: input.name,
      email: input.email,
      emailVerified: true,
      role: "admin",
    },
    { method: "email-password" },
  );
  if (!user) {
    const body: ApiEnvelope<null> = {
      success: false,
      data: null,
      error: "failed to create admin user",
    };
    return Response.json(body, { status: 500 });
  }
  await ctx.internalAdapter.linkAccount({
    userId: user.id,
    providerId: "credential",
    accountId: user.id,
    password: hash,
  });
  setBootstrapCache(false);
  const body: ApiEnvelope<{ id: string; email: string }> = {
    success: true,
    data: { id: user.id, email: user.email },
  };
  return Response.json(body, { status: 201 });
}

export const POST = withRateLimit(
  [{ windowSec: 3600, max: 10 }],
  (request: Request) => rateKey(["bootstrap", getClientIp(request)]),
  handlePOST,
);
