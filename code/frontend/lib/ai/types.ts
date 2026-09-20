/** Shared shapes for the model adapter (RAG plan §4). */

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ChatProvider {
  readonly name: string;
  complete(messages: ChatMessage[], opts?: { maxTokens?: number }): Promise<string>;
}

export interface EmbedProvider {
  readonly name: string;
  /** Model id, e.g. onnx-community/all-MiniLM-L6-v2-ONNX. */
  readonly model: string;
  /** Vector dimension (Redis index is dim-bound). */
  readonly dim: number;
  embed(texts: string[]): Promise<number[][]>;
}

/** Configuration errors — mapped to honest UI/API states, never stack traces. */
export class AiConfigError extends Error {
  readonly code: "SETUP_REQUIRED" | "MISSING_KEY" | "UNKNOWN_MODEL";
  constructor(code: AiConfigError["code"], message: string) {
    super(message);
    this.code = code;
  }
}

/** Known embedding models and their dims. Unknown ids are rejected (dim-bound index). */
export const EMBED_MODELS: Record<string, { provider: string; dim: number }> = {
  "onnx-community/all-MiniLM-L6-v2-ONNX": { provider: "local", dim: 384 },
  "Xenova/all-MiniLM-L6-v2": { provider: "local", dim: 384 },
  "onnx-community/bge-small-en-v1.5-ONNX": { provider: "local", dim: 384 },
  "Xenova/bge-small-en-v1.5": { provider: "local", dim: 384 },
  "Xenova/paraphrase-multilingual-MiniLM-L12-v2": { provider: "local", dim: 384 },
  "text-embedding-3-small": { provider: "openai", dim: 1536 },
  "text-embedding-004": { provider: "gemini", dim: 768 },
};

export const CHAT_PROVIDERS = ["openai", "openrouter", "anthropic", "gemini"] as const;
export type ChatProviderId = (typeof CHAT_PROVIDERS)[number];

export function isChatProvider(value: string | null): value is ChatProviderId {
  return (CHAT_PROVIDERS as readonly string[]).includes(value ?? "");
}

/** Provider default chat models (overridable per user in AI Setup). */
export const CHAT_DEFAULT_MODELS: Record<ChatProviderId, string> = {
  openai: "gpt-4o-mini",
  openrouter: "openai/gpt-4o-mini",
  anthropic: "claude-3-5-haiku-latest",
  gemini: "gemini-2.0-flash",
};
