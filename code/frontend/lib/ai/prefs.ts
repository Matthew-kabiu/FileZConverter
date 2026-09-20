import { ensureAppTables } from "@/lib/db/app-tables";
import { getDb } from "@/lib/db/sqlite";

/**
 * Per-user model picks (RAG plan §5). Env supplies deployment defaults;
 * explicit user picks win. Models are validated against the adapter
 * allowlist at use time, not here.
 */
export interface AiPrefs {
  chatProvider: string | null;
  chatModel: string | null;
  embedProvider: string | null;
  embedModel: string | null;
}

export const DEFAULT_PREFS: Required<Pick<AiPrefs, "embedProvider" | "embedModel">> & AiPrefs = {
  chatProvider: process.env.AI_CHAT_PROVIDER ?? null,
  chatModel: process.env.AI_CHAT_MODEL ?? null,
  embedProvider: process.env.AI_EMBED_PROVIDER ?? "local",
  embedModel: process.env.AI_EMBED_MODEL ?? "onnx-community/all-MiniLM-L6-v2-ONNX",
};

export function getAiPrefs(userId: string): AiPrefs {
  ensureAppTables();
  const row = getDb()
    .prepare(
      "SELECT chat_provider AS chatProvider, chat_model AS chatModel, embed_provider AS embedProvider, embed_model AS embedModel FROM user_ai_prefs WHERE user_id = ?",
    )
    .get(userId) as AiPrefs | undefined;
  return {
    chatProvider: row?.chatProvider ?? DEFAULT_PREFS.chatProvider,
    chatModel: row?.chatModel ?? DEFAULT_PREFS.chatModel,
    embedProvider: row?.embedProvider ?? DEFAULT_PREFS.embedProvider,
    embedModel: row?.embedModel ?? DEFAULT_PREFS.embedModel,
  };
}

export function setAiPrefs(userId: string, prefs: Partial<AiPrefs>): AiPrefs {
  ensureAppTables();
  const current = getAiPrefs(userId);
  const next: AiPrefs = {
    chatProvider: prefs.chatProvider ?? current.chatProvider,
    chatModel: prefs.chatModel ?? current.chatModel,
    embedProvider: prefs.embedProvider ?? current.embedProvider,
    embedModel: prefs.embedModel ?? current.embedModel,
  };
  getDb()
    .prepare(
      `INSERT INTO user_ai_prefs (user_id, chat_provider, chat_model, embed_provider, embed_model, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT (user_id) DO UPDATE SET chat_provider = excluded.chat_provider, chat_model = excluded.chat_model, embed_provider = excluded.embed_provider, embed_model = excluded.embed_model, updated_at = excluded.updated_at`,
    )
    .run(
      userId,
      next.chatProvider,
      next.chatModel,
      next.embedProvider,
      next.embedModel,
      Date.now(),
    );
  return next;
}
