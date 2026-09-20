import { headers } from "next/headers";
import { auth, ensureAuthSchema } from "@/lib/auth/auth";
import { getDb } from "@/lib/db/sqlite";

export interface SessionUser {
  id: string;
  email: string;
  role?: string | null;
}

/** Current Better Auth session (with admin-plugin role), or null. */
export async function getSession(): Promise<{ user: SessionUser } | null> {
  await ensureAuthSchema();
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return null;
  const role = (session.user as { role?: string | null }).role ?? null;
  return { user: { id: session.user.id, email: session.user.email, role } };
}

/** True when no account exists yet — first-run bootstrap is still open. */
let bootstrapCache: { value: boolean; at: number } | null = null;
const BOOTSTRAP_CACHE_MS = 30_000;

export async function isBootstrapNeeded(): Promise<boolean> {
  const now = Date.now();
  if (bootstrapCache && now - bootstrapCache.at < BOOTSTRAP_CACHE_MS) {
    return bootstrapCache.value;
  }
  await ensureAuthSchema();
  const row = getDb()
    .prepare('SELECT COUNT(*) AS n FROM "user"')
    .get() as { n: number };
  bootstrapCache = { value: row.n === 0, at: now };
  return bootstrapCache.value;
}

/** Invalidate the bootstrap cache (call after creating the first user). */
export function setBootstrapCache(value: boolean): void {
  bootstrapCache = { value, at: Date.now() };
}

export async function requireUser(): Promise<{ user: SessionUser }> {
  const session = await getSession();
  if (!session) throw new Error("unauthorized");
  return session;
}

export async function requireAdmin(): Promise<{ user: SessionUser }> {
  const session = await requireUser();
  if (session.user.role !== "admin") throw new Error("forbidden");
  return session;
}
