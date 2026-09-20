import { betterAuth } from "better-auth";
import { admin } from "better-auth/plugins/admin";
import { getMigrations } from "better-auth/db/migration";
import { SqliteDialect } from "kysely";
import { getDb } from "@/lib/db/sqlite";

function requiredServerEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `[auth] Missing required server env ${name}. See .env.example (BETTER_AUTH_SECRET, BETTER_AUTH_URL).`,
    );
  }
  return value;
}

/**
 * Better Auth instance (RAG plan §3): email + password, public signup
 * DISABLED (closed signup — admin creates accounts), min password 12,
 * admin plugin for user management. SQLite via Kysely dialect.
 *
 * Importing this module throws without BETTER_AUTH_SECRET — auth routes and
 * pages must run with server env present (never NEXT_PUBLIC_*).
 */
export const auth = betterAuth({
  database: new SqliteDialect({ database: getDb() }),
  secret: requiredServerEnv("BETTER_AUTH_SECRET"),
  baseURL: process.env.BETTER_AUTH_URL,
  emailAndPassword: {
    enabled: true,
    disableSignUp: true,
    minPasswordLength: 12,
    autoSignIn: false,
  },
  // Brute-force shield: 100 req/min generally, 5 sign-in attempts per 15 min.
  rateLimit: {
    enabled: true,
    window: 60,
    max: 100,
    customRules: {
      "/sign-in/email": { window: 900, max: 5 },
    },
  },
  plugins: [admin()],
});

let migration: Promise<void> | null = null;

/**
 * Applies pending Better Auth table migrations. Idempotent per process.
 *
 * Memoizes the PROMISE, not a boolean: concurrent first requests (the browser
 * fires get-session alongside the first page load) would both observe the flag
 * still false, both start migrating, and each would run auth.handler against a
 * half-built schema — the "Database schema mismatch / Missing tables" pair seen
 * in dev logs. Awaiting one shared promise makes the later callers queue behind
 * the first migration instead of racing it. Cleared on failure so a transient
 * error does not poison every later request.
 */
export function ensureAuthSchema(): Promise<void> {
  migration ??= (async () => {
    const plan = await getMigrations(auth.options);
    await plan.runMigrations();
  })().catch((error: unknown) => {
    migration = null;
    throw error;
  });
  return migration;
}
