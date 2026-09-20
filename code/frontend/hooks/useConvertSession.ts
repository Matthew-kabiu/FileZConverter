"use client";

import { useCallback, useEffect, useRef } from "react";
import { apiClient } from "@/lib/api/apiClient";
import { getRagSessionId, rotateRagSessionId } from "@/lib/rag-session";
import { ROUTES } from "@/lib/routes";

/**
 * One conversion session per browser (RAG plan §1): id for server tmp
 * attribution, clear-all purge, and auto-purge on tab close (keepalive
 * beacon). Shared across studios via localStorage — this is also the RAG
 * session key, so chat spans studios on this device only.
 */
export function useConvertSession() {
  const sessionRef = useRef<string>("");

  useEffect(() => {
    sessionRef.current = getRagSessionId();
    const purge = () => {
      const id = sessionRef.current;
      if (!id) return;
      fetch(`${ROUTES.api.session}?sessionId=${encodeURIComponent(id)}`, {
        method: "DELETE",
        keepalive: true,
      }).catch(() => undefined);
    };
    window.addEventListener("pagehide", purge);
    return () => window.removeEventListener("pagehide", purge);
  }, []);

  const sessionId = useCallback(() => {
    if (!sessionRef.current && typeof window !== "undefined") {
      sessionRef.current = getRagSessionId();
    }
    return sessionRef.current;
  }, []);

  const purgeNow = useCallback(async (): Promise<void> => {
    try {
      const id = sessionId();
      if (id) await apiClient.session.purge(id);
    } finally {
      sessionRef.current = rotateRagSessionId();
    }
  }, [sessionId]);

  return { sessionId, purgeNow };
}
