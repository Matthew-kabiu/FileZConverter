import { getRedis } from "@/lib/ai/redis";

/**
 * Redis sliding-window rate limiter (RAG plan §6). One shared implementation
 * for every Route Handler; Better Auth uses its own built-in limiter for
 * auth endpoints. Fails OPEN (logs) when Redis is down — conversions must
 * never 500 because the limiter is unreachable.
 */
export interface RatePolicy {
  windowSec: number;
  max: number;
}

export interface RateDecision {
  allowed: boolean;
  retryAfterSec: number;
}

export function rateKey(parts: (string | number | null | undefined)[]): string {
  return parts
    .map((p) => String(p ?? "anon").replace(/[^A-Za-z0-9_.-]/g, "_"))
    .join(":");
}

/** Client IP behind a single trusted proxy (Cloudflare → Coolify). */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const first = forwarded?.split(",")[0]?.trim();
  return first || "unknown-ip";
}

export async function checkRateLimit(
  key: string,
  policies: RatePolicy[],
): Promise<RateDecision> {
  try {
    const r = await getRedis();
    const now = Date.now();
    let retryAfterSec = 0;
    for (const p of policies) {
      const k = `rl:${key}:${p.windowSec}`;
      const member = `${now}:${Math.random().toString(36).slice(2, 10)}`;
      const execRes = await r
        .multi()
        .zAdd(k, { score: now, value: member })
        .zRemRangeByScore(k, 0, now - p.windowSec * 1000)
        .zCard(k)
        .expire(k, p.windowSec)
        .exec();
      const count = Number(execRes?.[2] ?? 0);
      if (count > p.max) {
        const oldest = await r.zRangeWithScores(k, 0, 0);
        const oldestScore = oldest[0]?.score ?? now;
        retryAfterSec = Math.max(
          retryAfterSec,
          Math.ceil((oldestScore + p.windowSec * 1000 - now) / 1000),
        );
        return { allowed: false, retryAfterSec: Math.max(retryAfterSec, 1) };
      }
    }
    return { allowed: true, retryAfterSec: 0 };
  } catch (err) {
    console.error("[ratelimit] Redis unreachable, failing open:", err);
    return { allowed: true, retryAfterSec: 0 };
  }
}

export function rateLimitedResponse(retryAfterSec: number): Response {
  return Response.json(
    {
      success: false,
      data: null,
      error: `rate limited, retry in ${retryAfterSec}s`,
    },
    {
      status: 429,
      headers: { "Retry-After": String(retryAfterSec) },
    },
  );
}

/** Wraps a Route Handler with rate policies. Key excludes secrets by construction. */
export function withRateLimit<T extends unknown[]>(
  policies: RatePolicy[],
  keyOf: (...args: T) => string | Promise<string>,
  handler: (...args: T) => Promise<Response>,
): (...args: T) => Promise<Response> {
  return async (...args: T): Promise<Response> => {
    const decision = await checkRateLimit(await keyOf(...args), policies);
    if (!decision.allowed) return rateLimitedResponse(decision.retryAfterSec);
    return handler(...args);
  };
}
