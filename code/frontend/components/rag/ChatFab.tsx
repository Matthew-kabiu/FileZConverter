"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import DOMPurify from "isomorphic-dompurify";
import { marked } from "marked";
import {
  CircleCheck,
  LoaderCircle,
  LogOut,
  MessageCircle,
  Send,
  Sparkles,
  Settings2,
  ShieldCheck,
  Trash2,
  TriangleAlert,
  UserRound,
  X,
} from "lucide-react";
import { apiClient, ApiClientError } from "@/lib/api/apiClient";
import { getSignInRoute, ROUTES } from "@/lib/routes";
import { useDismiss } from "@/hooks/useDismiss";
import { getRagSessionId, rotateRagSessionId } from "@/lib/rag-session";
import { cn } from "@/lib/utils/cn";
import {
  RAG_INDEX_EVENT,
  RAG_RETRY_EVENT,
  type RagIndexStatus,
} from "@/hooks/useRagIndex";

interface Citation {
  file: string;
  section?: string;
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  citations?: Citation[];
}

type SendState = "idle" | "sending";

interface ChatUser {
  name?: string | null;
  email?: string | null;
  role?: string | null;
}

function MarkdownMessage({ text }: { text: string }) {
  const html = useMemo(() => {
    try {
      const parsed = marked.parse(text);
      return DOMPurify.sanitize(typeof parsed === "string" ? parsed : "");
    } catch {
      return "";
    }
  }, [text]);

  if (!html) return <p>{text}</p>;

  return (
    <div
      className="md-preview chat-markdown"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

/**
 * Floating RAG chat (RAG plan §5 UI): bottom-right FAB opening a themed
 * panel. Mobile-first bottom sheet, floating card on sm+. Backend
 * (`POST /api/v1/ask`) lands in P5 — until then every state is honest:
 * setup-required, sign-in-required, and backend-missing are all surfaced
 * instead of faked.
 */
export function ChatFab({
  user,
  initialDraft = "",
  onSignOut,
  onRequireAuth,
}: {
  user?: ChatUser;
  initialDraft?: string;
  onSignOut: () => Promise<void>;
  onRequireAuth: (question?: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState(initialDraft);
  const [sendState, setSendState] = useState<SendState>("idle");
  const [indexStatus, setIndexStatus] = useState<RagIndexStatus | null>(null);
  const [indexedFiles, setIndexedFiles] = useState<
    { key: string; fileName: string; chunks?: number }[]
  >([]);
  const [notice, setNotice] = useState<
    | { kind: "setup" }
    | { kind: "signin" }
    | { kind: "unavailable" }
    | { kind: "cleared" }
    | { kind: "error"; text: string }
    | null
  >(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const transcriptEndRef = useRef<HTMLDivElement | null>(null);
  const closeChat = () => {
    setMenuOpen(false);
    setOpen(false);
  };
  useDismiss(wrapRef, closeChat, open && !menuOpen);
  useDismiss(menuRef, () => setMenuOpen(false), menuOpen);

  useEffect(() => {
    const onIndex = (event: Event) => {
      const status = (event as CustomEvent<RagIndexStatus>).detail;
      setIndexStatus(status);
      if (status.state === "ready") {
        const key = `${status.studio}:${status.fileName}`;
        setIndexedFiles((prev) => [
          ...prev.filter((f) => f.key !== key),
          { key, fileName: status.fileName, chunks: status.chunks },
        ]);
      }
    };
    window.addEventListener(RAG_INDEX_EVENT, onIndex);
    return () => window.removeEventListener(RAG_INDEX_EVENT, onIndex);
  }, []);
  useEffect(() => {
    if (!open) return;
    const frame = window.requestAnimationFrame(() => {
      transcriptEndRef.current?.scrollIntoView({ block: "nearest" });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [messages, notice, open, sendState]);
  const initial = (user?.name ?? user?.email ?? "?").trim().charAt(0).toUpperCase() || "?";
  const isAdmin = user?.role === "admin";

  /** "Clear chat memory": deletes THIS browser's vectors, rotates the session. */
  const clearMemory = async () => {
    setNotice(null);
    try {
      await apiClient.rag.revokeSession(getRagSessionId());
    } catch {
      // Best-effort — local state still resets.
    } finally {
      rotateRagSessionId();
      setMessages([]);
      setIndexStatus(null);
      setIndexedFiles([]);
      setNotice({ kind: "cleared" });
    }
  };

  const send = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const question = draft.trim();
    if (!question || sendState === "sending") return;
    if (!user) {
      onRequireAuth(question);
      return;
    }
    setDraft("");
    setNotice(null);
    setMessages((prev) => [
      ...prev,
      { id: crypto.randomUUID(), role: "user", text: question },
    ]);
    setSendState("sending");
    try {
      const data = await apiClient.rag.ask({
        sessionId: getRagSessionId(),
        question,
      });
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          text: data.answer,
          citations: data.citations,
        },
      ]);
    } catch (err) {
      if (err instanceof ApiClientError) {
        if (err.statusCode === 409) {
          setNotice({ kind: "setup" });
          return;
        }
        if (err.statusCode === 401) {
          setNotice({ kind: "signin" });
          onRequireAuth(question);
          return;
        }
        if (err.statusCode === 404) {
          setNotice({ kind: "unavailable" });
          return;
        }
        setNotice({ kind: "error", text: err.userMessage });
        return;
      }
      setNotice({ kind: "error", text: "Could not reach the chat service." });
    } finally {
      setSendState("idle");
    }
  };

  return (
    <div
      ref={wrapRef}
      className="fixed bottom-[max(1rem,env(safe-area-inset-bottom))] left-1/2 z-50 w-[calc(100%_-_2rem)] max-w-96 -translate-x-1/2 sm:right-6 sm:left-auto sm:w-96 sm:translate-x-0"
    >
      {open && (
        <div
          role="dialog"
          aria-label="Snow — ask your files"
          className="relative mb-3 flex max-h-[70dvh] w-full flex-col overflow-hidden rounded-2xl border border-ocean-500/15 bg-white/95 shadow-2xl backdrop-blur dark:border-white/10 dark:bg-twilight-300/95"
        >
          <div className="flex shrink-0 items-center justify-between gap-2 border-b border-ocean-500/10 px-4 py-3 dark:border-white/10">
            <div className="min-w-0">
              <h2 className="truncate font-display text-sm font-semibold">
                Snow
              </h2>
              <p
                className="truncate text-[11px] opacity-60"
                title={indexedFiles.map((f) => f.fileName).join(", ") || indexStatus?.fileName}
              >
                {user
                  ? indexedFiles.length > 1
                    ? `${indexedFiles.length} documents ready`
                    : (indexedFiles[0]?.fileName ??
                      indexStatus?.fileName ??
                      "Ask your files · answers cite the file and section")
                  : "Snow answers from your documents"}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              {user && (
                <div ref={menuRef} className="relative">
                  <button
                    type="button"
                    onClick={() => setMenuOpen((value) => !value)}
                    aria-expanded={menuOpen}
                    aria-haspopup="menu"
                    aria-label="Account menu"
                    className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg bg-gradient-to-br from-ocean-500 to-surf-500 font-display text-xs font-semibold text-white shadow-sm transition hover:scale-105"
                  >
                    {initial}
                  </button>
                  {menuOpen && (
                    <div
                      role="menu"
                      aria-label="Account"
                      className="absolute top-10 right-0 z-20 w-48 rounded-xl border border-ocean-500/15 bg-white p-1.5 font-display shadow-xl dark:border-white/10 dark:bg-twilight-300"
                    >
                      <p className="truncate px-3 py-1.5 text-xs opacity-60">
                        {user.email ?? user.name}
                      </p>
                      <Link
                        href={isAdmin ? ROUTES.pages.adminUsers : ROUTES.pages.adminAi}
                        role="menuitem"
                        onClick={() => setMenuOpen(false)}
                        className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm opacity-80 transition-colors hover:bg-ocean-500/10 hover:opacity-100"
                      >
                        {isAdmin ? (
                          <ShieldCheck size={14} aria-hidden />
                        ) : (
                          <Settings2 size={14} aria-hidden />
                        )}
                        {isAdmin ? "Admin panel" : "AI settings"}
                      </Link>
                      <button
                        type="button"
                        role="menuitem"
                        onClick={async () => {
                          setMenuOpen(false);
                          await onSignOut();
                        }}
                        className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm opacity-80 transition-colors hover:bg-ocean-500/10 hover:opacity-100"
                      >
                        <LogOut size={14} aria-hidden />
                        Sign out
                      </button>
                    </div>
                  )}
                </div>
              )}
              {!user && (
                <button
                  type="button"
                  onClick={() => onRequireAuth()}
                  aria-label="Open account sign in"
                  data-tooltip-id="app-tooltip"
                  data-tooltip-content="Sign in"
                  className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg bg-gradient-to-br from-ocean-500 to-surf-500 text-white shadow-sm transition duration-200 hover:-translate-y-0.5 hover:scale-105 hover:shadow-md active:translate-y-0"
                >
                  <UserRound size={16} aria-hidden />
                </button>
              )}
              {user && (
                <button
                  type="button"
                  onClick={clearMemory}
                  aria-label="Clear chat memory for this browser"
                  data-tooltip-id="app-tooltip"
                  data-tooltip-content="Clear chat memory"
                  className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg opacity-70 transition-colors hover:bg-ocean-500/10 hover:opacity-100"
                >
                  <Trash2 size={15} aria-hidden />
                </button>
              )}
              <button
                type="button"
                onClick={closeChat}
                aria-label="Close chat"
                className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg opacity-70 transition-colors hover:bg-ocean-500/10 hover:opacity-100"
              >
                <X size={16} aria-hidden />
              </button>
            </div>
          </div>

          <div
            aria-live="polite"
            className="min-h-[30dvh] flex-1 overflow-y-auto px-4 py-3"
          >
            {messages.length === 0 && !notice && indexStatus?.state === "indexing" && (
              <div className="flex items-start gap-2.5 rounded-xl bg-ocean-500/8 p-3 text-sm">
                <LoaderCircle size={16} className="mt-0.5 shrink-0 animate-spin text-surf-500" aria-hidden />
                <p>
                  Indexing <strong className="font-semibold">{indexStatus.fileName}</strong> for
                  chat…
                </p>
              </div>
            )}
            {messages.length === 0 && !notice && indexStatus?.state === "ready" && (
              <div className="flex items-start gap-2.5 rounded-xl bg-emerald-500/10 p-3 text-sm">
                <CircleCheck size={16} className="mt-0.5 shrink-0 text-emerald-500" aria-hidden />
                <p>
                  <strong className="font-semibold">{indexStatus.fileName}</strong> is ready.
                  {typeof indexStatus.chunks === "number" && ` ${indexStatus.chunks} sections indexed.`}
                </p>
              </div>
            )}
            {messages.length === 0 && !notice && indexStatus?.state === "setup" && (
              <div className="flex items-start gap-2.5 rounded-xl bg-amber-500/10 p-3 text-sm">
                <TriangleAlert size={16} className="mt-0.5 shrink-0 text-amber-500" aria-hidden />
                <p>
                  AI setup is incomplete.{" "}
                  <Link href={ROUTES.pages.adminAi} className="underline underline-offset-4">
                    Open settings
                  </Link>
                </p>
              </div>
            )}
            {messages.length === 0 && !notice && indexStatus?.state === "error" && (
              <div className="flex items-start gap-2.5 rounded-xl bg-red-500/10 p-3 text-sm">
                <TriangleAlert size={16} className="mt-0.5 shrink-0 text-red-500" aria-hidden />
                <p>
                  Couldn&apos;t index <strong className="font-semibold">{indexStatus.fileName}</strong>.
                  <button
                    type="button"
                    onClick={() => window.dispatchEvent(new Event(RAG_RETRY_EVENT))}
                    className="ml-1 cursor-pointer font-semibold underline underline-offset-4"
                  >
                    Retry
                  </button>
                </p>
              </div>
            )}
            {messages.length === 0 && !notice && !indexStatus && (
              <div className="max-w-[92%] rounded-xl bg-ocean-500/10 px-3 py-2 text-sm break-words dark:bg-white/10">
                <MarkdownMessage text="Hi, I'm **Snow** ❄️ — your document assistant. Upload a file in any studio, then ask me about it. I answer only from your documents." />
              </div>
            )}
            <ul className="space-y-2">
              {messages.map((m) => (
                <li
                  key={m.id}
                  className={cn(
                    "max-w-[92%] rounded-xl px-3 py-2 text-sm break-words",
                    m.role === "user"
                      ? "ml-auto bg-gradient-to-r from-ocean-500 to-surf-500 text-white"
                      : "bg-ocean-500/10 dark:bg-white/10",
                  )}
                >
                  {m.role === "assistant" ? (
                    <MarkdownMessage text={m.text} />
                  ) : (
                    <p>{m.text}</p>
                  )}
                </li>
              ))}
              {sendState === "sending" && (
                <li
                  role="status"
                  aria-label="The model is thinking and preparing a response"
                  className="w-fit max-w-[92%] rounded-xl bg-ocean-500/10 px-3 py-2.5 text-sm dark:bg-white/10"
                >
                  <div className="flex items-center gap-2 text-surf-600 dark:text-surf-500">
                    <Sparkles
                      size={15}
                      className="chat-thinking-icon shrink-0"
                      aria-hidden
                    />
                    <span className="font-medium">Thinking</span>
                    <span className="chat-thinking-dots" aria-hidden>
                      <span />
                      <span />
                      <span />
                    </span>
                  </div>
                </li>
              )}
            </ul>
            {notice?.kind === "setup" && (
              <p className="mt-2 text-sm opacity-80">
                AI isn&apos;t set up yet.{" "}
                <Link href={ROUTES.pages.adminAi} className="underline underline-offset-4">
                  Open AI settings
                </Link>
              </p>
            )}
            {notice?.kind === "signin" && (
              <p className="mt-2 text-sm opacity-80">
                Sign in to chat with your files.{" "}
                <Link href={getSignInRoute()} className="underline underline-offset-4">
                  Sign in
                </Link>
              </p>
            )}
            {notice?.kind === "unavailable" && (
              <p className="mt-2 text-sm opacity-60">
                Chat backend lands in P5 — this panel is ready for it.
              </p>
            )}
            {notice?.kind === "cleared" && (
              <p className="mt-2 text-sm opacity-60">
                Chat memory cleared for this browser.
              </p>
            )}
            {notice?.kind === "error" && (
              <p role="alert" className="mt-2 text-sm text-red-500">
                {notice.text}
              </p>
            )}
            <div ref={transcriptEndRef} />
          </div>

          <form
            onSubmit={send}
            className="flex shrink-0 items-center gap-2 border-t border-ocean-500/10 px-3 py-2.5 dark:border-white/10"
          >
            <label htmlFor="chat-fab-input" className="sr-only">
              Ask Snow about your files
            </label>
            <input
              id="chat-fab-input"
              type="text"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Ask Snow about your files…"
              autoComplete="off"
              className="h-10 min-w-0 flex-1 rounded-xl border border-ocean-500/20 bg-transparent px-3 text-sm outline-none focus:border-surf-500/60 dark:border-white/10"
            />
            <button
              type="submit"
              disabled={sendState === "sending" || draft.trim() === ""}
              aria-label="Send question to Snow"
              className="inline-flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-xl bg-gradient-to-r from-ocean-500 to-surf-500 text-white transition-opacity disabled:opacity-50"
            >
              {sendState === "sending" ? (
                <LoaderCircle size={16} className="animate-spin" aria-hidden />
              ) : (
                <Send size={16} aria-hidden />
              )}
            </button>
          </form>
        </div>
      )}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => {
            if (open) closeChat();
            else setOpen(true);
          }}
          aria-expanded={open}
          aria-label={open ? "Close Snow chat" : "Open Snow chat"}
          className="inline-flex h-12 w-12 cursor-pointer items-center justify-center rounded-full bg-gradient-to-br from-ocean-500 to-surf-500 text-white shadow-lg shadow-ocean-500/25 transition-transform hover:scale-105"
        >
          {open ? (
            <X size={20} aria-hidden />
          ) : (
            <MessageCircle size={20} aria-hidden />
          )}
        </button>
      </div>
    </div>
  );
}
