import {
  AiConfigError,
  CHAT_DEFAULT_MODELS,
  EMBED_MODELS,
  isChatProvider,
  type ChatProvider,
  type EmbedProvider,
} from "@/lib/ai/types";
import { getAiPrefs } from "@/lib/ai/prefs";
import { getProviderKey, type VaultProvider } from "@/lib/ai/vault";
import { createLocalEmbedder } from "@/lib/ai/providers/local-embed";
import { createOpenAiChat, createOpenAiEmbedder } from "@/lib/ai/providers/openai";
import { createAnthropicChat } from "@/lib/ai/providers/anthropic";
import { createGeminiChat, createGeminiEmbedder } from "@/lib/ai/providers/gemini";

const ENV_KEYS: Partial<Record<VaultProvider, string | undefined>> = {
  openai: process.env.AI_OPENAI_API_KEY,
  openrouter: process.env.AI_OPENROUTER_API_KEY,
  anthropic: process.env.AI_ANTHROPIC_API_KEY,
  gemini: process.env.AI_GEMINI_API_KEY,
};

/** User vault key first, env fallback second. */
function resolveKey(userId: string, provider: VaultProvider): string | null {
  return getProviderKey(userId, provider) ?? ENV_KEYS[provider] ?? null;
}

/** Chat provider for a user: prefs → key check → instance. */
export function getChatProvider(userId: string): { provider: string; chat: ChatProvider } {
  const prefs = getAiPrefs(userId);
  if (!prefs.chatProvider || !isChatProvider(prefs.chatProvider)) {
    throw new AiConfigError("SETUP_REQUIRED", "No chat provider selected (AI Setup).");
  }
  const provider = prefs.chatProvider;
  const key = resolveKey(userId, provider);
  if (!key) {
    throw new AiConfigError("MISSING_KEY", `No API key saved for ${provider} (AI Setup).`);
  }
  const model = prefs.chatModel ?? CHAT_DEFAULT_MODELS[provider];
  switch (provider) {
    case "openai":
      return { provider, chat: createOpenAiChat({ apiKey: key, model }) };
    case "openrouter": {
      const baseURL = process.env.AI_OPENROUTER_BASE_URL;
      if (!baseURL) {
        throw new AiConfigError(
          "SETUP_REQUIRED",
          "OpenRouter base URL not configured (AI_OPENROUTER_BASE_URL).",
        );
      }
      return {
        provider,
        chat: createOpenAiChat({ apiKey: key, model, baseURL, name: "openrouter" }),
      };
    }
    case "anthropic":
      return { provider, chat: createAnthropicChat(key, model) };
    case "gemini":
      return { provider, chat: createGeminiChat(key, model) };
  }
}

/** Embeddings for a user: local default (no key), API when selected. */
export function getEmbedProvider(userId: string): EmbedProvider {
  const prefs = getAiPrefs(userId);
  const model = prefs.embedModel ?? "onnx-community/all-MiniLM-L6-v2-ONNX";
  const known = EMBED_MODELS[model];
  if (!known) {
    throw new AiConfigError("UNKNOWN_MODEL", `Unknown embedding model: ${model}.`);
  }
  if (known.provider === "local") {
    return createLocalEmbedder(model, known.dim);
  }
  if (known.provider === "openai") {
    const key = resolveKey(userId, "openai");
    if (!key) throw new AiConfigError("MISSING_KEY", "No API key saved for openai (AI Setup).");
    return createOpenAiEmbedder(key, model, known.dim);
  }
  const key = resolveKey(userId, "gemini");
  if (!key) throw new AiConfigError("MISSING_KEY", "No API key saved for gemini (AI Setup).");
  return createGeminiEmbedder(key, model, known.dim);
}
