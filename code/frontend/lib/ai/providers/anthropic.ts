import Anthropic from "@anthropic-ai/sdk";
import type { ChatMessage, ChatProvider } from "@/lib/ai/types";

/** Anthropic chat. Note: Anthropic has no embeddings API — chat only. */
export function createAnthropicChat(apiKey: string, model: string): ChatProvider {
  const client = new Anthropic({ apiKey });
  return {
    name: "anthropic",
    async complete(messages: ChatMessage[], request?: { maxTokens?: number }): Promise<string> {
      const system = messages
        .filter((m) => m.role === "system")
        .map((m) => m.content)
        .join("\n\n");
      const turns = messages
        .filter((m) => m.role !== "system")
        .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));
      const res = await client.messages.create({
        model,
        max_tokens: request?.maxTokens ?? 1024,
        ...(system ? { system } : {}),
        messages: turns,
      });
      const text = res.content.find((b) => b.type === "text");
      return (text && "text" in text ? text.text : "").trim();
    },
  };
}
