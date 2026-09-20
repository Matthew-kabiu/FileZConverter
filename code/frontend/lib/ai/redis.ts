import { createClient } from "redis";

type Redis = Awaited<ReturnType<typeof createClient>>;

let client: Redis | null = null;
let connecting: Promise<Redis> | null = null;

/**
 * Shared Redis handle (RAG vectors + rate limits). Lazy-connects on first
 * use; REDIS_URL carries the password (redis://:pwd@host:6379).
 */
export async function getRedis(): Promise<Redis> {
  if (client?.isOpen) return client;
  if (!connecting) {
    const url = process.env.REDIS_URL;
    if (!url) throw new Error("[redis] REDIS_URL is not configured.");
    const next = createClient({ url });
    next.on("error", () => undefined);
    connecting = next
      .connect()
      .then(() => {
        client = next as Redis;
        return client;
      })
      .catch((err) => {
        connecting = null;
        throw err;
      });
  }
  return connecting;
}
