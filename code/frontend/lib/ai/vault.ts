import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { ensureAppTables } from "@/lib/db/app-tables";
import { getDb } from "@/lib/db/sqlite";

/**
 * Per-user provider key vault (RAG plan §5/D4): AES-256-GCM under the
 * server master key AI_VAULT_KEY. Hashing would be wrong here — keys must be
 * recoverable to call providers. Server-only: never import from client code.
 */
export const VAULT_PROVIDERS = ["openai", "openrouter", "anthropic", "gemini"] as const;
export type VaultProvider = (typeof VAULT_PROVIDERS)[number];

export function isVaultProvider(value: string): value is VaultProvider {
  return (VAULT_PROVIDERS as readonly string[]).includes(value);
}

function vaultKey(): Buffer {
  const hex = process.env.AI_VAULT_KEY;
  if (!hex || !/^[0-9a-fA-F]{64}$/.test(hex)) {
    throw new Error(
      "[vault] AI_VAULT_KEY must be 64 hex chars (openssl rand -hex 32).",
    );
  }
  return Buffer.from(hex, "hex");
}

export function encryptSecret(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", vaultKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return `${iv.toString("hex")}:${cipher.getAuthTag().toString("hex")}:${ciphertext.toString("hex")}`;
}

export function decryptSecret(payload: string): string {
  const [ivHex, tagHex, ctHex] = payload.split(":");
  if (!ivHex || !tagHex || !ctHex) throw new Error("[vault] malformed payload");
  const decipher = createDecipheriv("aes-256-gcm", vaultKey(), Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(Buffer.from(tagHex, "hex"));
  return Buffer.concat([
    decipher.update(Buffer.from(ctHex, "hex")),
    decipher.final(),
  ]).toString("utf8");
}

export interface VaultEntry {
  provider: VaultProvider;
  label: string | null;
  updatedAt: number;
}

/** Upsert (rotate) a provider key. Key material never leaves this module decrypted. */
export function setProviderKey(
  userId: string,
  provider: VaultProvider,
  key: string,
  label?: string,
): VaultEntry {
  ensureAppTables();
  const now = Date.now();
  getDb()
    .prepare(
      `INSERT INTO provider_vault (user_id, provider, encrypted_key, label, updated_at)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT (user_id, provider) DO UPDATE SET encrypted_key = excluded.encrypted_key, label = excluded.label, updated_at = excluded.updated_at`,
    )
    .run(userId, provider, encryptSecret(key), label ?? null, now);
  return { provider, label: label ?? null, updatedAt: now };
}

export function deleteProviderKey(userId: string, provider: VaultProvider): boolean {
  ensureAppTables();
  const res = getDb()
    .prepare("DELETE FROM provider_vault WHERE user_id = ? AND provider = ?")
    .run(userId, provider);
  return Number(res.changes) > 0;
}

/** Metadata only — never secrets. Safe to send to the client. */
export function listProviderKeys(userId: string): VaultEntry[] {
  ensureAppTables();
  const rows = getDb()
    .prepare(
      "SELECT provider, label, updated_at AS updatedAt FROM provider_vault WHERE user_id = ? ORDER BY provider",
    )
    .all(userId) as { provider: string; label: string | null; updatedAt: number }[];
  return rows.filter((r) => isVaultProvider(r.provider)) as VaultEntry[];
}

/** Decrypted key for server-side provider calls. Null when not configured. */
export function getProviderKey(userId: string, provider: VaultProvider): string | null {
  ensureAppTables();
  const row = getDb()
    .prepare("SELECT encrypted_key AS ek FROM provider_vault WHERE user_id = ? AND provider = ?")
    .get(userId, provider) as { ek: string } | undefined;
  if (!row) return null;
  return decryptSecret(row.ek);
}
