"use client";

/**
 * Browser RAG session id (RAG plan §1): localStorage singleton shared by all
 * studios in this browser. Survives normal refresh, dies on site-data clear.
 * New device/browser = new id = fresh RAG data (keys roam via account).
 */
const KEY = "filezconverter-rag-session";

export function getRagSessionId(): string {
  if (typeof window === "undefined") return "";
  try {
    const existing = window.localStorage.getItem(KEY);
    if (existing) return existing;
    const id = crypto.randomUUID();
    window.localStorage.setItem(KEY, id);
    return id;
  } catch {
    return crypto.randomUUID();
  }
}

export function rotateRagSessionId(): string {
  const id = crypto.randomUUID();
  try {
    window.localStorage.setItem(KEY, id);
  } catch {
    // Private mode etc. — ephemeral id still works for this tab.
  }
  return id;
}
