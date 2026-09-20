import { createHash } from "node:crypto";
import { SCHEMA_FIELD_TYPE, SCHEMA_VECTOR_FIELD_ALGORITHM } from "redis";
import { getRedis } from "@/lib/ai/redis";

/**
 * Session-scoped vector store on Redis Stack (RAG plan D1/D4).
 * Keys: rag:{userId}:{sessionId}:{studio}:{fileKey}:{i} (HASH).
 * Index per embedding dim (dim-bound): idx:rag:{dim}.
 * Every key carries the session TTL — orphans self-delete.
 */
export interface RagChunk {
  text: string;
  file: string;
  studio: string;
  score?: number;
}

function sanitizeFileKey(name: string): string {
  const base = name.split("/").pop() ?? "file";
  return base.replace(/[^A-Za-z0-9._-]/g, "_").slice(0, 64) || "file";
}

export function ragTtlSec(): number {
  const hours = Number(process.env.AI_RAG_TTL_HOURS ?? "24");
  return (Number.isFinite(hours) && hours > 0 ? hours : 24) * 3600;
}

function indexName(dim: number): string {
  return `idx:rag:${dim}`;
}

const ensuredIndexes = new Set<string>();

export async function ensureVectorIndex(dim: number): Promise<void> {
  if (ensuredIndexes.has(indexName(dim))) return;
  const r = await getRedis();
  try {
    await r.ft.create(
      indexName(dim),
      {
        embedding: {
          type: SCHEMA_FIELD_TYPE.VECTOR,
          ALGORITHM: SCHEMA_VECTOR_FIELD_ALGORITHM.HNSW,
          TYPE: "FLOAT32",
          DIM: dim,
          DISTANCE_METRIC: "COSINE",
        },
        text: { type: SCHEMA_FIELD_TYPE.TEXT },
        file: { type: SCHEMA_FIELD_TYPE.TEXT },
        studio: { type: SCHEMA_FIELD_TYPE.TEXT },
        // Session fence: sha1(userId:sessionId) — hex-only so TAG tokenization
        // can't split it (uuid hyphens would). KNN always filters on it, so
        // one browser can never read another's vectors.
        owner: { type: SCHEMA_FIELD_TYPE.TAG },
      },
      { ON: "HASH", PREFIX: "rag:" },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (!message.toLowerCase().includes("exists")) throw err;
  }
  ensuredIndexes.add(indexName(dim));
}

export function ownerTag(userId: string, sessionId: string): string {
  return createHash("sha1").update(`${userId}:${sessionId}`).digest("hex");
}

function toVectorBuffer(vector: number[]): Buffer {
  return Buffer.from(new Float32Array(vector).buffer);
}

export interface UpsertFile {
  userId: string;
  sessionId: string;
  studio: string;
  fileName: string;
  chunks: string[];
  vectors: number[][];
  dim: number;
}

/** Replaces one file's vectors (re-index is idempotent per file). */
export async function upsertSessionFile(opts: UpsertFile): Promise<number> {
  const r = await getRedis();
  await ensureVectorIndex(opts.dim);
  const prefix = `rag:${opts.userId}:${opts.sessionId}:${opts.studio}:${sanitizeFileKey(opts.fileName)}`;
  // Drop previous vectors for this file before writing the new set.
  const stale: string[] = [];
  for await (const keys of r.scanIterator({ MATCH: `${prefix}:*`, COUNT: 200 })) {
    stale.push(...keys);
  }
  if (stale.length > 0) await r.del(stale);
  const ttl = ragTtlSec();
  const owner = ownerTag(opts.userId, opts.sessionId);
  let written = 0;
  for (let i = 0; i < opts.chunks.length; i += 1) {
    const vector = opts.vectors[i];
    if (!vector || vector.length !== opts.dim) continue;
    const key = `${prefix}:${i}`;
    await r.hSet(key, {
      embedding: toVectorBuffer(vector),
      text: opts.chunks[i] ?? "",
      file: opts.fileName,
      studio: opts.studio,
      owner,
    });
    await r.expire(key, ttl);
    written += 1;
  }
  return written;
}

export async function knnSearch(opts: {
  userId: string;
  sessionId: string;
  vector: number[];
  dim: number;
  k?: number;
}): Promise<RagChunk[]> {
  const r = await getRedis();
  await ensureVectorIndex(opts.dim);
  const k = opts.k ?? 5;
  // Session fence lives in the query itself: only this browser's hashes match.
  const res = (await r.ft.search(
    indexName(opts.dim),
    `(@owner:{${ownerTag(opts.userId, opts.sessionId)}})=>[KNN ${k} @embedding $vec AS score]`,
    {
      PARAMS: { vec: toVectorBuffer(opts.vector) },
      RETURN: ["text", "file", "studio", "score"],
      SORTBY: { BY: "score" },
      DIALECT: 2,
      LIMIT: { from: 0, size: k },
    },
  )) as unknown as {
    documents: { value: Record<string, unknown> }[];
  };
  return (res.documents ?? []).map((d) => ({
    text: String(d.value.text ?? ""),
    file: String(d.value.file ?? ""),
    studio: String(d.value.studio ?? ""),
    score: Number(d.value.score ?? 0),
  }));
}

/** Deletes one file's vectors (studio file-removal path). */
export async function deleteSessionFile(opts: {
  userId: string;
  sessionId: string;
  studio: string;
  fileName: string;
}): Promise<number> {
  const r = await getRedis();
  const prefix = `rag:${opts.userId}:${opts.sessionId}:${opts.studio}:${sanitizeFileKey(opts.fileName)}`;
  let deleted = 0;
  const batch: string[] = [];
  for await (const keys of r.scanIterator({ MATCH: `${prefix}:*`, COUNT: 200 })) {
    for (const key of keys) {
      batch.push(key);
      if (batch.length >= 100) {
        deleted += await r.del(batch.splice(0));
      }
    }
  }
  if (batch.length > 0) deleted += await r.del(batch);
  return deleted;
}

export async function deleteSessionVectors(userId: string, sessionId?: string): Promise<number> {
  const r = await getRedis();
  const match = sessionId
    ? `rag:${userId}:${sessionId}:*`
    : `rag:${userId}:*`;
  let deleted = 0;
  const batch: string[] = [];
  for await (const keys of r.scanIterator({ MATCH: match, COUNT: 200 })) {
    for (const key of keys) {
      batch.push(key);
      if (batch.length >= 100) {
        deleted += await r.del(batch.splice(0));
      }
    }
  }
  if (batch.length > 0) deleted += await r.del(batch);
  return deleted;
}

export interface RagSessionInfo {
  sessionId: string;
  studios: string[];
  chunks: number;
}

/** Lists sessions holding vectors for a user (per-device view + revoke). */
export async function listUserSessions(userId: string): Promise<RagSessionInfo[]> {
  const r = await getRedis();
  const bySession = new Map<string, { studios: Set<string>; chunks: number }>();
  for await (const keys of r.scanIterator({ MATCH: `rag:${userId}:*`, COUNT: 500 })) {
    for (const key of keys) {
      // rag:{userId}:{sessionId}:{studio}:{file}:{i}
      const parts = key.split(":");
      if (parts.length < 6) continue;
      const sessionId = parts[2] ?? "";
      const studio = parts[3] ?? "";
      if (!sessionId) continue;
      let entry = bySession.get(sessionId);
      if (!entry) {
        entry = { studios: new Set(), chunks: 0 };
        bySession.set(sessionId, entry);
      }
      entry.studios.add(studio);
      entry.chunks += 1;
    }
  }
  return [...bySession.entries()].map(([sessionId, v]) => ({
    sessionId,
    studios: [...v.studios],
    chunks: v.chunks,
  }));
}
