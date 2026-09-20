import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// Isolated SQLite per run: env must be set BEFORE importing the auth chain
// (module singletons read it lazily via getDb, secret eagerly via auth).
process.env.DATA_DIR = mkdtempSync(join(tmpdir(), "filez-auth-test-"));
process.env.BETTER_AUTH_SECRET =
  "test-secret-0123456789abcdef0123456789abcdef";
process.env.BETTER_AUTH_URL = "http://localhost:3000";

const { ensureAuthSchema } = await import("@/lib/auth/auth");
const { isBootstrapNeeded } = await import("@/lib/auth/session");
const { getDb } = await import("@/lib/db/sqlite");

describe("auth bootstrap (P1)", () => {
  it("migrates Better Auth tables and reports bootstrap open on a fresh db", async () => {
    await ensureAuthSchema();
    expect(await isBootstrapNeeded()).toBe(true);
    const tables = getDb()
      .prepare(
        "SELECT name FROM sqlite_master WHERE type = 'table' AND name IN ('user', 'session', 'account', 'verification')",
      )
      .all() as { name: string }[];
    const names = tables.map((t) => t.name).sort();
    expect(names).toEqual(["account", "session", "user", "verification"]);
  });

  it("migration is idempotent within a process", async () => {
    await expect(ensureAuthSchema()).resolves.toBeUndefined();
    expect(await isBootstrapNeeded()).toBe(true);
  });
});
