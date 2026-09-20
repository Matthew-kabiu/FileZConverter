"use client";

import { useEffect, useRef, useState } from "react";
import { apiClient, ApiClientError } from "@/lib/api/apiClient";
import { authClient } from "@/lib/auth/client";
import { getRagSessionId } from "@/lib/rag-session";

export const RAG_INDEX_EVENT = "filez:rag-index";
export const RAG_RETRY_EVENT = "filez:rag-retry";

export interface RagIndexStatus {
  state: "indexing" | "ready" | "setup" | "error";
  studio: string;
  fileName: string;
  chunks?: number;
}

export interface RagIndexFile {
  fileName: string;
  text: string;
}

function announce(status: RagIndexStatus): void {
  window.dispatchEvent(new CustomEvent<RagIndexStatus>(RAG_INDEX_EVENT, { detail: status }));
}

/** Cheap change fingerprint: length + djb2 over a bounded prefix. */
function fingerprint(text: string): string {
  let hash = 5381;
  const n = Math.min(text.length, 65536);
  for (let i = 0; i < n; i += 1) {
    hash = ((hash << 5) + hash + text.charCodeAt(i)) | 0;
  }
  return `${text.length}:${hash}`;
}

/**
 * Auto-indexes every open document in a studio (debounced). Silent by
 * design: logged-out sessions never schedule work; unconfigured (409),
 * offline, or Redis-down resolve to quiet states rather than toast spam.
 * Per-file fingerprints mean typing in one file never re-embeds the others.
 */
export function useRagIndexFiles(studio: string, files: RagIndexFile[]): void {
  const { data: session, isPending } = authClient.useSession();
  const quiet = useRef(new Set<string>());
  const indexed = useRef(new Map<string, string>());
  const chunksCache = useRef(new Map<string, number>());
  const announced = useRef(new Set<string>());
  const [attempt, setAttempt] = useState(0);
  const authenticated = Boolean(session?.user);

  useEffect(() => {
    const retry = () => {
      quiet.current.clear();
      indexed.current.clear();
      chunksCache.current.clear();
      announced.current.clear();
      setAttempt((value) => value + 1);
    };
    window.addEventListener(RAG_RETRY_EVENT, retry);
    return () => window.removeEventListener(RAG_RETRY_EVENT, retry);
  }, []);

  // Stable effect key — the files array identity changes every render.
  const key = files
    .map((f) => `${studio}:${f.fileName}:${fingerprint(f.text)}`)
    .sort()
    .join("|");

  useEffect(() => {
    if (isPending || !authenticated) return;
    const pending = files.filter((f) => {
      if (!f.fileName || !f.text.trim()) return false;
      const k = `${studio}:${f.fileName}`;
      if (quiet.current.has(k)) return false;
      return indexed.current.get(k) !== fingerprint(f.text);
    });
    // Re-announce ready for unchanged files once per mount, so a freshly
    // opened chat panel lists documents indexed earlier in the session.
    for (const f of files) {
      const k = `${studio}:${f.fileName}`;
      if (announced.current.has(k)) continue;
      if (pending.some((p) => `${studio}:${p.fileName}` === k)) continue;
      if (!indexed.current.has(k)) continue;
      announced.current.add(k);
      announce({ state: "ready", studio, fileName: f.fileName, chunks: chunksCache.current.get(k) });
    }
    if (pending.length === 0) return;
    let active = true;
    const timer = setTimeout(async () => {
      for (const f of pending) {
        if (!active) return;
        const k = `${studio}:${f.fileName}`;
        announce({ state: "indexing", studio, fileName: f.fileName });
        try {
          const result = await apiClient.rag.index({
            sessionId: getRagSessionId(),
            studio,
            fileName: f.fileName,
            text: f.text.slice(0, 500_000),
          });
          if (!active) return;
          indexed.current.set(k, fingerprint(f.text));
          chunksCache.current.set(k, result.chunks);
          announced.current.add(k);
          announce({ state: "ready", studio, fileName: f.fileName, chunks: result.chunks });
        } catch (err) {
          if (!active) return;
          if (err instanceof ApiClientError) {
            if (err.statusCode === 401 || err.statusCode === 409) {
              quiet.current.add(k);
              if (err.statusCode === 409) {
                announce({ state: "setup", studio, fileName: f.fileName });
              }
              continue;
            }
          }
          announce({ state: "error", studio, fileName: f.fileName });
        }
      }
    }, 2000);
    return () => {
      active = false;
      clearTimeout(timer);
    };
    // `key` is the stable identity of `files` — intentional.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studio, key, attempt, authenticated, isPending]);
}

/** Single-file wrapper around the multi-file hook. */
export function useRagIndex(studio: string, fileName: string | null, text: string): void {
  useRagIndexFiles(studio, fileName ? [{ fileName, text }] : []);
}
