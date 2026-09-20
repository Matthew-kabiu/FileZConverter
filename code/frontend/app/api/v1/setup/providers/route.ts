import { z } from "zod";
import { ensureAuthSchema } from "@/lib/auth/auth";
import { requireUser } from "@/lib/auth/session";
import {
  deleteProviderKey,
  isVaultProvider,
  listProviderKeys,
  setProviderKey,
} from "@/lib/ai/vault";
import type { ApiEnvelope } from "@/types/api";
import { getClientIp, rateKey, withRateLimit } from "@/lib/security/rateLimit";
import { getSession } from "@/lib/auth/session";

const setSchema = z.object({
  provider: z.string().min(1).max(32),
  key: z.string().min(1).max(500),
  label: z.string().max(100).optional(),
});

/** List configured providers (metadata only — never key material). */
async function handleGET(): Promise<Response> {
  await ensureAuthSchema();
  let userId: string;
  try {
    userId = (await requireUser()).user.id;
  } catch {
    const body: ApiEnvelope<null> = { success: false, data: null, error: "unauthorized" };
    return Response.json(body, { status: 401 });
  }
  const body: ApiEnvelope<ReturnType<typeof listProviderKeys>> = {
    success: true,
    data: listProviderKeys(userId),
  };
  return Response.json(body);
}

/** Save (rotate) a provider key. */
async function handlePOST(request: Request): Promise<Response> {
  await ensureAuthSchema();
  let userId: string;
  try {
    userId = (await requireUser()).user.id;
  } catch {
    const body: ApiEnvelope<null> = { success: false, data: null, error: "unauthorized" };
    return Response.json(body, { status: 401 });
  }
  let input: z.infer<typeof setSchema>;
  try {
    input = setSchema.parse(await request.json());
  } catch {
    const body: ApiEnvelope<null> = {
      success: false,
      data: null,
      error: "{provider, key} required",
    };
    return Response.json(body, { status: 400 });
  }
  if (!isVaultProvider(input.provider)) {
    const body: ApiEnvelope<null> = {
      success: false,
      data: null,
      error: "unknown provider (openai, openrouter, anthropic, gemini)",
    };
    return Response.json(body, { status: 400 });
  }
  try {
    const entry = setProviderKey(userId, input.provider, input.key, input.label);
    const body: ApiEnvelope<typeof entry> = { success: true, data: entry };
    return Response.json(body, { status: 201 });
  } catch {
    const body: ApiEnvelope<null> = {
      success: false,
      data: null,
      error: "vault unavailable (AI_VAULT_KEY misconfigured?)",
    };
    return Response.json(body, { status: 500 });
  }
}

/** Delete a provider key (?provider=). */
async function handleDELETE(request: Request): Promise<Response> {
  await ensureAuthSchema();
  let userId: string;
  try {
    userId = (await requireUser()).user.id;
  } catch {
    const body: ApiEnvelope<null> = { success: false, data: null, error: "unauthorized" };
    return Response.json(body, { status: 401 });
  }
  const provider = new URL(request.url).searchParams.get("provider") ?? "";
  if (!isVaultProvider(provider)) {
    const body: ApiEnvelope<null> = {
      success: false,
      data: null,
      error: "unknown provider",
    };
    return Response.json(body, { status: 400 });
  }
  const deleted = deleteProviderKey(userId, provider);
  const body: ApiEnvelope<{ deleted: boolean }> = {
    success: true,
    data: { deleted },
  };
  return Response.json(body);
}

export const GET = withRateLimit(
  [{ windowSec: 3600, max: 100 }],
  async (request: Request) => { const s = await getSession().catch(() => null); return s ? rateKey(["setup-providers", "user", s.user.id]) : rateKey(["setup-providers", "ip", getClientIp(request)]); },
  handleGET,
);

export const POST = withRateLimit(
  [{ windowSec: 3600, max: 30 }],
  async (request: Request) => { const s = await getSession().catch(() => null); return s ? rateKey(["setup-providers", "user", s.user.id]) : rateKey(["setup-providers", "ip", getClientIp(request)]); },
  handlePOST,
);

export const DELETE = withRateLimit(
  [{ windowSec: 3600, max: 30 }],
  async (request: Request) => { const s = await getSession().catch(() => null); return s ? rateKey(["setup-providers", "user", s.user.id]) : rateKey(["setup-providers", "ip", getClientIp(request)]); },
  handleDELETE,
);
