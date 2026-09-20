import { getDb } from "@/lib/db/sqlite";

/**
 * App tables beside Better Auth's own (RAG plan §2). Idempotent — safe to
 * call on every boot path. Auth tables are handled by ensureAuthSchema().
 */
export function ensureAppTables(): void {
  const db = getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      token_hash TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      expires_at INTEGER NOT NULL,
      used_at INTEGER,
      created_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_reset_user ON password_reset_tokens(user_id);
    CREATE TABLE IF NOT EXISTS provider_vault (
      user_id TEXT NOT NULL,
      provider TEXT NOT NULL,
      encrypted_key TEXT NOT NULL,
      label TEXT,
      updated_at INTEGER NOT NULL,
      PRIMARY KEY (user_id, provider)
    );
    CREATE TABLE IF NOT EXISTS user_ai_prefs (
      user_id TEXT PRIMARY KEY,
      chat_provider TEXT,
      chat_model TEXT,
      embed_provider TEXT,
      embed_model TEXT,
      updated_at INTEGER NOT NULL
    );
  `);
}
