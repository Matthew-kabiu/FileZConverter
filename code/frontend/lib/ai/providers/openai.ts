import OpenAI from "openai";
import type { ChatMessage, ChatProvider, EmbedProvider } from "@/lib/ai/types";

/** OpenAI + OpenRouter (OpenAI-compatible via baseURL) — chat. */
export function createOpenAiChat(opts: {
  apiKey: string;
  model: string;
  baseURL?: string;
  name?: string;
}): ChatProvider {
  const client = new OpenAI({ apiKey: opts.apiKey, baseURL: opts.baseURL });
  return {
    name: opts.name ?? "openai",
    async complete(messages: ChatMessage[], request?: { maxTokens?: number }): Promise<string> {
      const res = await client.chat.completions.create({
        model: opts.model,
        max_tokens: request?.maxTokens ?? 1024,
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
      });
      const providerError = (
        res as unknown as { error?: { code?: number; message?: string } }
      ).error;
      if (providerError) {
        const error = new Error(providerError.message ?? "Provider returned an error.") as Error & {
          status?: number;
        };
        error.status = providerError.code;
        throw error;
      }
      const answer = res.choices?.[0]?.message?.content?.trim();
      if (!answer) {
        throw new Error("Provider returned an empty or malformed completion.");
      }
      return answer;
    },
  };
}

/** OpenAI embeddings (API alternative to local). */
export function createOpenAiEmbedder(apiKey: string, model: string, dim: number): EmbedProvider {
  const client = new OpenAI({ apiKey });
  return {
    name: `openai:${model}`,
    model,
    dim,
    async embed(texts: string[]): Promise<number[][]> {
      if (texts.length === 0) return [];
      const res = await client.embeddings.create({ model, input: texts });
      return res.data
        .sort((a, b) => a.index - b.index)
        .map((d) => d.embedding.slice(0, dim));
    },
  };
}
