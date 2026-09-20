import { z } from "zod";
import { ensureAuthSchema } from "@/lib/auth/auth";
import { requireUser } from "@/lib/auth/session";
import { AiConfigError, type ChatMessage } from "@/lib/ai/types";
import { getChatProvider, getEmbedProvider } from "@/lib/ai/factory";
import { knnSearch } from "@/lib/ai/rag";
import type { ApiEnvelope } from "@/types/api";
import { getClientIp, rateKey, withRateLimit } from "@/lib/security/rateLimit";
import { getSession } from "@/lib/auth/session";

const SESSION_ID = /^[A-Za-z0-9_-]{1,64}$/;

const askSchema = z.object({
  sessionId: z.string().regex(SESSION_ID),
  question: z.string().trim().min(1).max(2000),
});

export interface AskResult {
  answer: string;
  citations: { file: string; section: string }[];
  empty: boolean;
}

const SYSTEM_PROMPT = `You answer questions about the user's uploaded documents. Rules:
- Answer ONLY from the provided context. If the context doesn't contain the answer, say so plainly.
- Every factual claim ends with a citation like [filename · chunk n]. Use the FILE and CHUNK labels given.
- Format answers as valid Markdown with short paragraphs, headings, and lists where they improve readability.
- Be concise. No invented details, no filler.`;

function providerFailure(error: unknown): { code: string; status: number; detail: string } {
  const detail = error instanceof Error ? error.message : "AI provider request failed";
  const providerStatus =
    typeof error === "object" && error !== null && "status" in error
      ? Number((error as { status?: unknown }).status)
      : undefined;

  if (providerStatus === 429 || /(?:^|\D)429(?:\D|$)|rate.?limit/i.test(detail)) {
    return { code: "PROVIDER_RATE_LIMITED", status: 429, detail };
  }
  if (
    providerStatus === 503 ||
    /temporar(?:ily)? (?:overloaded|unavailable)|service (?:is )?overloaded/i.test(detail)
  ) {
    return { code: "PROVIDER_UNAVAILABLE", status: 503, detail };
  }
  return { code: "PROVIDER_ERROR", status: 502, detail };
}

/**
 * Session-scoped RAG ask (RAG plan §4/§5). Retrieval is fenced to this
 * browser's vectors via the owner tag — cross-session reads are impossible
 * by construction, and the handler additionally scopes everything to the
 * caller's user id. (P6 rate-limits: 10/min + 60/hour per user.)
 */
async function handlePOST(request: Request): Promise<Response> {
  await ensureAuthSchema();
  let userId: string;
  try {
    userId = (await requireUser()).user.id;
  } catch {
    const body: ApiEnvelope<null> = { success: false, data: null, error: "unauthorized" };
    return Response.json(body, { status: 401 });
  }
  let input: z.infer<typeof askSchema>;
  try {
    input = askSchema.parse(await request.json());
  } catch {
    const body: ApiEnvelope<null> = { success: false, data: null, error: "invalid payload" };
    return Response.json(body, { status: 400 });
  }
  let embedder;
  let chat: ReturnType<typeof getChatProvider>;
  try {
    embedder = getEmbedProvider(userId);
    chat = getChatProvider(userId);
  } catch (err) {
    const code = err instanceof AiConfigError ? err.code : "SETUP_REQUIRED";
    const body: ApiEnvelope<null> = { success: false, data: null, error: code };
    return Response.json(body, { status: 409 });
  }
  try {
    const [queryVector] = await embedder.embed([input.question]);
    if (!queryVector) throw new Error("empty embedding");
    const hits = await knnSearch({
      userId,
      sessionId: input.sessionId,
      vector: queryVector,
      dim: embedder.dim,
      k: 5,
    });
    if (hits.length === 0) {
      const body: ApiEnvelope<AskResult> = {
        success: true,
        data: {
          answer: "No indexed content in this session yet — upload a file in any studio first.",
          citations: [],
          empty: true,
        },
      };
      return Response.json(body);
    }
    const context = hits
      .map(
        (h, i) =>
          `[${i + 1}] FILE: ${h.file} · STUDIO: ${h.studio}\n${h.text.slice(0, 1500)}`,
      )
      .join("\n\n---\n\n");
    const messages: ChatMessage[] = [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: `CONTEXT:\n${context}\n\nQUESTION: ${input.question}`,
      },
    ];
    const answer = await chat.chat.complete(messages, { maxTokens: 1024 });
    if (!answer.trim()) throw new Error("Provider returned an empty completion.");
    const body: ApiEnvelope<AskResult> = {
      success: true,
      data: {
        answer,
        citations: hits.map((h, i) => ({ file: h.file, section: `chunk ${i + 1}` })),
        empty: false,
      },
    };
    return Response.json(body);
  } catch (err) {
    const failure = providerFailure(err);
    console.error(`[rag/ask] ${failure.code}: ${failure.detail}`);
    const body: ApiEnvelope<null> = {
      success: false,
      data: null,
      error: failure.code,
    };
    return Response.json(body, { status: failure.status });
  }
}

export const POST = withRateLimit(
  [{ windowSec: 60, max: 10 }, { windowSec: 3600, max: 60 }],
  async (request: Request) => { const s = await getSession().catch(() => null); return s ? rateKey(["ask", "user", s.user.id]) : rateKey(["ask", "ip", getClientIp(request)]); },
  handlePOST,
);
