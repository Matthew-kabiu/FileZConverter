"use client";

import { useEffect, useRef } from "react";
import { apiClient } from "@/lib/api/apiClient";
import { ROUTES } from "@/lib/routes";

/**
 * One conversion session per mount: id for server tmp attribution,
 * clear-all purge, and auto-purge on tab close (keepalive beacon).
 */
export function useConvertSession() {
  const sessionRef = useRef<string>(crypto.randomUUID());

  useEffect(() => {
    const purge = () => {
      const id = sessionRef.current;
      fetch(`${ROUTES.api.session}?sessionId=${encodeURIComponent(id)}`, {
        method: "DELETE",
        keepalive: true,
      }).catch(() => undefined);
    };
    window.addEventListener("pagehide", purge);
    return () => window.removeEventListener("pagehide", purge);
  }, []);

  const purgeNow = async (): Promise<void> => {
    try {
      await apiClient.session.purge(sessionRef.current);
    } finally {
      sessionRef.current = crypto.randomUUID();
    }
  };

  return { sessionId: () => sessionRef.current, purgeNow };
}
