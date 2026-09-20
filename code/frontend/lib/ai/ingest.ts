import { chunkText } from "@/lib/ai/chunk";
import { getEmbedProvider } from "@/lib/ai/factory";
import { upsertSessionFile } from "@/lib/ai/rag";

/** Max chunks per file — bounds embedding CPU per upload. */
const MAX_CHUNKS = 200;

/** Max chars indexed per file — mirrors the L5 1M-char cap. */
const MAX_CHARS = 1_000_000;

export interface IndexInput {
  userId: string;
  sessionId: string;
  studio: string;
  fileName: string;
  text: string;
}

/** Chunk → embed → store. Local embeddings need no key, so this works pre-setup. */
export async function indexDocument(input: IndexInput): Promise<{ chunks: number }> {
  const text = input.text.slice(0, MAX_CHARS);
  if (!text.trim()) return { chunks: 0 };
  const embedder = getEmbedProvider(input.userId);
  const chunks = chunkText(text).slice(0, MAX_CHUNKS);
  if (chunks.length === 0) return { chunks: 0 };
  const vectors = await embedder.embed(chunks);
  const written = await upsertSessionFile({
    userId: input.userId,
    sessionId: input.sessionId,
    studio: input.studio,
    fileName: input.fileName,
    chunks,
    vectors,
    dim: embedder.dim,
  });
  return { chunks: written };
}
