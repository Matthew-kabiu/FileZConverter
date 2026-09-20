import { createHash, randomBytes } from "node:crypto";
import { auth, ensureAuthSchema } from "@/lib/auth/auth";
import { ensureAppTables } from "@/lib/db/app-tables";
import { getDb } from "@/lib/db/sqlite";

/** Option-B reset links (RAG plan D6): 30-minute, single-use, hashed at rest. */
const RESET_TTL_MS = 30 * 60 * 1000;

export function hashResetToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Deletes expired / consumed tokens. Fire-and-forget safe. */
export function sweepResetTokens(): number {
  try {
    ensureAppTables();
    const res = getDb()
      .prepare(
        "DELETE FROM password_reset_tokens WHERE expires_at < ? OR used_at IS NOT NULL",
      )
      .run(Date.now());
    return Number(res.changes);
  } catch {
    return 0;
  }
}

/** Mints a reset token for a user. Returns the RAW token once — store nothing. */
export async function issueResetToken(userId: string): Promise<string> {
  await ensureAuthSchema();
  ensureAppTables();
  sweepResetTokens();
  const token = randomBytes(32).toString("hex");
  getDb()
    .prepare(
      "INSERT INTO password_reset_tokens (token_hash, user_id, expires_at, used_at, created_at) VALUES (?, ?, ?, NULL, ?)",
    )
    .run(hashResetToken(token), userId, Date.now() + RESET_TTL_MS, Date.now());
  return token;
}

export interface RedeemResult {
  ok: boolean;
  userId: string | null;
}

/**
 * Validates a token WITHOUT revealing why it failed (oracle-free: unknown,
 * expired, and used tokens all look identical to the caller).
 */
export async function peekResetToken(token: string): Promise<RedeemResult> {
  await ensureAuthSchema();
  ensureAppTables();
  try {
    const row = getDb()
      .prepare(
        "SELECT user_id, expires_at, used_at FROM password_reset_tokens WHERE token_hash = ?",
      )
      .get(hashResetToken(token)) as
      | { user_id: string; expires_at: number; used_at: number | null }
      | undefined;
    if (!row || row.used_at !== null || row.expires_at < Date.now()) {
      return { ok: false, userId: null };
    }
    return { ok: true, userId: row.user_id };
  } catch {
    return { ok: false, userId: null };
  }
}

/** Atomically claims a valid token, revokes sessions, and sets the new password. */
export async function redeemResetToken(
  token: string,
  newPassword: string,
): Promise<boolean> {
  await ensureAuthSchema();
  ensureAppTables();
  const ctx = await auth.$context;
  const passwordHash = await ctx.password.hash(newPassword);
  const tokenHash = hashResetToken(token);
  const claimedAt = Date.now();
  const claimed = getDb()
    .prepare(
      "UPDATE password_reset_tokens SET used_at = ? WHERE token_hash = ? AND used_at IS NULL AND expires_at >= ? RETURNING user_id",
    )
    .get(claimedAt, tokenHash, claimedAt) as { user_id: string } | undefined;
  if (!claimed) return false;

  try {
    await ctx.internalAdapter.deleteUserSessions(claimed.user_id);
    await ctx.internalAdapter.updatePassword(claimed.user_id, passwordHash);
    return true;
  } catch (error) {
    getDb()
      .prepare(
        "UPDATE password_reset_tokens SET used_at = NULL WHERE token_hash = ? AND used_at = ?",
      )
      .run(tokenHash, claimedAt);
    throw error;
  }
}
