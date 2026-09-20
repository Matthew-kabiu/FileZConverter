import { GoogleGenAI } from "@google/genai";
import type { ChatMessage, ChatProvider, EmbedProvider } from "@/lib/ai/types";

/** Gemini chat + embeddings. */
export function createGeminiChat(apiKey: string, model: string): ChatProvider {
  const client = new GoogleGenAI({ apiKey });
  return {
    name: "gemini",
    async complete(messages: ChatMessage[], request?: { maxTokens?: number }): Promise<string> {
      const system = messages
        .filter((m) => m.role === "system")
        .map((m) => m.content)
        .join("\n\n");
      const contents = messages
        .filter((m) => m.role !== "system")
        .map((m) => ({
          role: m.role === "assistant" ? "model" : "user",
          parts: [{ text: m.content }],
        }));
      const res = await client.models.generateContent({
        model,
        contents,
        config: {
          ...(system ? { systemInstruction: system } : {}),
          maxOutputTokens: request?.maxTokens ?? 1024,
        },
      });
      return (res.text ?? "").trim();
    },
  };
}

export function createGeminiEmbedder(apiKey: string, model: string, dim: number): EmbedProvider {
  const client = new GoogleGenAI({ apiKey });
  return {
    name: `gemini:${model}`,
    model,
    dim,
    async embed(texts: string[]): Promise<number[][]> {
      const out: number[][] = [];
      for (const text of texts) {
        const res = await client.models.embedContent({ model, contents: text });
        const values = res.embeddings?.[0]?.values ?? [];
        out.push(values.slice(0, dim));
      }
      return out;
    },
  };
}
