import { headers } from "next/headers";
import { z } from "zod";
import { auth, ensureAuthSchema } from "@/lib/auth/auth";
import { requireAdmin } from "@/lib/auth/session";
import type { ApiEnvelope } from "@/types/api";
import { getClientIp, rateKey, withRateLimit } from "@/lib/security/rateLimit";
import { getSession } from "@/lib/auth/session";

const createSchema = z.object({
  name: z.string().trim().min(1).max(100),
  email: z.string().trim().email().max(255),
  password: z.string().min(12).max(256),
  role: z.enum(["user", "admin"]).optional(),
});

/** Admin: list users (closed signup — creation happens here, not publicly). */
async function handleGET(request: Request): Promise<Response> {
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
  const url = new URL(request.url);
  const users = await auth.api.listUsers({
    headers: await headers(),
    query: {
      limit: url.searchParams.get("limit") ?? "50",
      offset: url.searchParams.get("offset") ?? "0",
      searchValue: url.searchParams.get("search") ?? undefined,
      searchField: "email",
      searchOperator: "contains",
      sortBy: "createdAt",
      sortDirection: "desc",
    },
  });
  const body: ApiEnvelope<typeof users> = { success: true, data: users };
  return Response.json(body);
}

/** Admin: create a user (role defaults to "user"). */
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
  let input: z.infer<typeof createSchema>;
  try {
    input = createSchema.parse(await request.json());
  } catch {
    const body: ApiEnvelope<null> = {
      success: false,
      data: null,
      error: "name, valid email, password (min 12), optional role required",
    };
    return Response.json(body, { status: 400 });
  }
  try {
    const created = await auth.api.createUser({
      headers: await headers(),
      body: {
        name: input.name,
        email: input.email,
        password: input.password,
        role: input.role ?? "user",
      },
    });
    const body: ApiEnvelope<typeof created> = { success: true, data: created };
    return Response.json(body, { status: 201 });
  } catch {
    const body: ApiEnvelope<null> = {
      success: false,
      data: null,
      error: "failed to create user (email may be taken)",
    };
    return Response.json(body, { status: 422 });
  }
}

export const GET = withRateLimit(
  [{ windowSec: 3600, max: 100 }],
  async (request: Request) => { const s = await getSession().catch(() => null); return s ? rateKey(["admin-users", "user", s.user.id]) : rateKey(["admin-users", "ip", getClientIp(request)]); },
  handleGET,
);

export const POST = withRateLimit(
  [{ windowSec: 3600, max: 60 }],
  async (request: Request) => { const s = await getSession().catch(() => null); return s ? rateKey(["admin-users", "user", s.user.id]) : rateKey(["admin-users", "ip", getClientIp(request)]); },
  handlePOST,
);
