import { createClient } from "redis";

type Redis = Awaited<ReturnType<typeof createClient>>;

let client: Redis | null = null;
let connecting: Promise<Redis> | null = null;
let failedAt = 0;

/**
 * Fail-fast Redis handle (RAG vectors + rate limits). Lazy-connects on
 * first use; REDIS_URL carries the password (redis://:pwd@host:6379).
 *
 * Stopped-Redis failsafe: the socket connect budget is 2s (not the
 * client's ~30s default backoff), commands never queue while offline,
 * and a recent failure short-circuits new attempts for a cooldown window.
 * Every caller already degrades without Redis (rate limiter fails open,
 * session purge keeps tmp cleanup, RAG routes return store-unavailable),
 * so the only thing this must guarantee is speed: fast failure, fast
 * recovery when Redis returns.
 */
const CONNECT_TIMEOUT_MS = 2_000;
const BREAKER_COOLDOWN_MS = 10_000;

export class RedisUnavailableError extends Error {
  constructor() {
    super("[redis] unavailable (fail-fast)");
    this.name = "RedisUnavailableError";
  }
}

export async function getRedis(): Promise<Redis> {
  if (client?.isOpen) return client;
  if (Date.now() - failedAt < BREAKER_COOLDOWN_MS) {
    throw new RedisUnavailableError();
  }
  if (!connecting) {
    const url = process.env.REDIS_URL;
    if (!url) throw new Error("[redis] REDIS_URL is not configured.");
    const next = createClient({
      url,
      socket: { connectTimeout: CONNECT_TIMEOUT_MS },
      disableOfflineQueue: true,
    });
    next.on("error", () => undefined);
    connecting = next
      .connect()
      .then(() => {
        client = next as Redis;
        failedAt = 0;
        return client;
      })
      .catch((err) => {
        connecting = null;
        failedAt = Date.now();
        throw err;
      });
  }
  return connecting;
}
