import { headers } from "next/headers";
import { z } from "zod";
import { auth, ensureAuthSchema } from "@/lib/auth/auth";
import { requireAdmin } from "@/lib/auth/session";
import { getDb } from "@/lib/db/sqlite";
import type { ApiEnvelope } from "@/types/api";
import { getClientIp, rateKey, withRateLimit } from "@/lib/security/rateLimit";
import { getSession } from "@/lib/auth/session";

const patchSchema = z.object({
  banned: z.boolean(),
  banReason: z.string().max(500).optional(),
});

/** Admin: ban/unban a user. */
async function handlePATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
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
  const { id } = await params;
  let input: z.infer<typeof patchSchema>;
  try {
    input = patchSchema.parse(await request.json());
  } catch {
    const body: ApiEnvelope<null> = {
      success: false,
      data: null,
      error: "{banned: boolean} required",
    };
    return Response.json(body, { status: 400 });
  }
  const h = await headers();
  try {
    if (input.banned) {
      await auth.api.banUser({
        headers: h,
        body: { userId: id, banReason: input.banReason },
      });
    } else {
      await auth.api.unbanUser({ headers: h, body: { userId: id } });
    }
    const body: ApiEnvelope<{ userId: string; banned: boolean }> = {
      success: true,
      data: { userId: id, banned: input.banned },
    };
    return Response.json(body);
  } catch {
    const body: ApiEnvelope<null> = {
      success: false,
      data: null,
      error: "failed to update user",
    };
    return Response.json(body, { status: 422 });
  }
}

/**
 * Admin: delete a user + cascade (vault rows, reset tokens, sessions).
 * RAG vectors are TTL'd (24h) and keyed per user — orphans self-delete;
 * P5's revoke path deletes them eagerly when Redis is up.
 */
async function handleDELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
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
  const { id } = await params;
  try {
    await auth.api.removeUser({ headers: await headers(), body: { userId: id } });
    try {
      const db = getDb();
      db.prepare("DELETE FROM provider_vault WHERE user_id = ?").run(id);
      db.prepare("DELETE FROM password_reset_tokens WHERE user_id = ?").run(id);
    } catch {
      // Vault tables may not exist yet (P3) — user removal already succeeded.
    }
    const body: ApiEnvelope<{ userId: string }> = {
      success: true,
      data: { userId: id },
    };
    return Response.json(body);
  } catch {
    const body: ApiEnvelope<null> = {
      success: false,
      data: null,
      error: "failed to delete user",
    };
    return Response.json(body, { status: 422 });
  }
}

export const PATCH = withRateLimit(
  [{ windowSec: 3600, max: 60 }],
  async (request: Request, context: { params: Promise<{ id: string }> }) => {
    void context;
    const session = await getSession().catch(() => null);
    return session
      ? rateKey(["admin-user", "user", session.user.id])
      : rateKey(["admin-user", "ip", getClientIp(request)]);
  },
  handlePATCH,
);

export const DELETE = withRateLimit(
  [{ windowSec: 3600, max: 60 }],
  async (request: Request, context: { params: Promise<{ id: string }> }) => {
    void context;
    const session = await getSession().catch(() => null);
    return session
      ? rateKey(["admin-user", "user", session.user.id])
      : rateKey(["admin-user", "ip", getClientIp(request)]);
  },
  handleDELETE,
);
