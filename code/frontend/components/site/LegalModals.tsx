"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { useDismiss } from "@/hooks/useDismiss";

export type LegalDoc = "privacy" | "terms";

function PrivacyBody() {
  return (
    <div className="space-y-4 text-[15px] leading-7 opacity-80">
      <p>
        FilezConverter is built privacy-first: your files stay on your device
        unless a conversion explicitly needs the server. This policy explains
        what runs where, in plain language.
      </p>
      <h3 className="font-display text-base font-semibold text-inherit opacity-100">
        Files and conversions
      </h3>
      <p>
        Client-first lanes (text, Markdown, HTML previews) never leave your
        browser. Server lanes run in an isolated per-session tmp directory that
        is deleted after every response, with a manual purge control and a
        30-minute sweeper as backstop. Uploads are capped at 25MB and Markdown
        inputs at 1M characters. Nothing is retained, profiled, or reused.
      </p>
      <h3 className="font-display text-base font-semibold text-inherit opacity-100">
        Document assistant (Snow) and RAG memory
      </h3>
      <p>
        When signed in, uploaded or extracted text is chunked, embedded, and
        stored in Redis under a per-user, per-browser session id with a TTL
        (default 24h). Retrieval filters on that session tag, so no other
        browser can read your vectors. “Clear chat memory” deletes this
        browser&apos;s vectors immediately and rotates the session id. Provider
        keys you save are encrypted with AES-256-GCM under the server master
        key and are never sent to the browser.
      </p>
      <h3 className="font-display text-base font-semibold text-inherit opacity-100">
        Accounts and authentication
      </h3>
      <p>
        Accounts store only what sign-in needs: name, email, and a password
        hash, plus role and timestamps. Password resets use single-use,
        time-limited tokens. Admins can manage users and wipe an account&apos;s
        vault rows, reset tokens, sessions, and vectors on deletion.
      </p>
      <h3 className="font-display text-base font-semibold text-inherit opacity-100">
        Cookies and local storage
      </h3>
      <p>
        Sessions use a minimal auth cookie. Preferences (theme), editor
        snapshots, and the anonymous RAG session id live in your browser
        storage. Clearing site data signs you out and orphans server vectors
        until TTL expiry — they become unreachable without the id.
      </p>
      <h3 className="font-display text-base font-semibold text-inherit opacity-100">
        Support messages
      </h3>
      <p>
        Feedback sent through the Support form includes the type, description,
        optional email, page, and timestamp you submit. It is forwarded to our
        support pipeline so we can triage bugs and feature requests. Include an
        email only if you want a reply.
      </p>
      <h3 className="font-display text-base font-semibold text-inherit opacity-100">
        Your rights
      </h3>
      <p>
        Purge a session any time, clear chat memory per browser, delete your
        snapshots locally, or ask the instance admin to delete your account and
        all associated data. Self-hosters control their own data, keys, and
        retention windows.
      </p>
    </div>
  );
}

function TermsBody() {
  return (
    <div className="space-y-4 text-[15px] leading-7 opacity-80">
      <p>
        These terms cover your use of this FilezConverter instance — the four
        studios, conversions, accounts, AI features, and support channels.
      </p>
      <h3 className="font-display text-base font-semibold text-inherit opacity-100">
        The service
      </h3>
      <p>
        FilezConverter provides in-browser viewing and editing plus optional
        server-side conversion lanes. Studios work without an account; sign-in
        unlocks the document assistant, AI setup, and admin tools on instances
        that enable them.
      </p>
      <h3 className="font-display text-base font-semibold text-inherit opacity-100">
        Acceptable use
      </h3>
      <p>
        Don&apos;t abuse the service: no circumventing rate limits (120
        conversions/hr/IP, ask 10/min + 60/hr, ingest 30/hr), no uploading
        malware or content you have no right to process, no probing other
        users&apos; sessions, and no using outputs to harm others. Operators
        may throttle or block abusive clients.
      </p>
      <h3 className="font-display text-base font-semibold text-inherit opacity-100">
        Your files, your responsibility
      </h3>
      <p>
        You keep all rights to your content. Verify exports before sharing or
        printing — conversions are best-effort rendering, and complex layouts
        may need a manual check. Keep your own backups; sessions and tmp data
        are purged by design and cannot be recovered.
      </p>
      <h3 className="font-display text-base font-semibold text-inherit opacity-100">
        AI features and bring-your-own-keys
      </h3>
      <p>
        Chat and embeddings run on provider keys the tenant supplies. Model
        spend belongs to the key owner. Answers are generated from your own
        documents and may be wrong — verify anything important. Local
        embeddings are free and never leave the operator&apos;s
        infrastructure.
      </p>
      <h3 className="font-display text-base font-semibold text-inherit opacity-100">
        Availability and liability
      </h3>
      <p>
        The service is provided “as is”, without warranties. Self-hosted
        instances are operated by their owners, who set their own domains,
        keys, and retention. To the maximum extent permitted by law, neither
        the project nor instance operators are liable for indirect or
        consequential loss from use of the service.
      </p>
      <h3 className="font-display text-base font-semibold text-inherit opacity-100">
        Changes and contact
      </h3>
      <p>
        Material changes to these terms will be reflected here with a revised
        date. Questions, bugs, or requests: use the Support form in the app —
        it reaches the team behind this instance directly.
      </p>
    </div>
  );
}

/**
 * Legal modal: Privacy Policy / Terms of Service at 80vw × 80vh,
 * in the current design theme.
 */
export function LegalModal({
  doc,
  onClose,
}: {
  doc: LegalDoc;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  useDismiss(ref, onClose, true);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const title = doc === "privacy" ? "Privacy Policy" : "Terms of Service";
  const subtitle =
    doc === "privacy"
      ? "How your files, memory, and account data are handled"
      : "The rules for using this FilezConverter instance";

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm sm:p-8"
      onClick={onClose}
      role="presentation"
    >
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        className="flex h-[80vh] max-h-[80vh] w-[80vw] max-w-4xl flex-col overflow-hidden rounded-2xl border border-ocean-500/20 bg-white shadow-2xl dark:border-white/10 dark:bg-twilight-300"
      >
        <div className="flex shrink-0 items-start justify-between gap-2 px-5 pt-5 sm:px-8 sm:pt-6">
          <div className="min-w-0">
            <h2 className="font-display text-2xl font-bold tracking-tight">
              {title}
            </h2>
            <p className="mt-1 text-sm opacity-70">{subtitle}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={`Close ${title}`}
            className="inline-flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg opacity-70 transition-colors hover:bg-ocean-500/10 hover:opacity-100"
          >
            <X size={16} aria-hidden />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 sm:px-8 sm:py-5">
          {doc === "privacy" ? <PrivacyBody /> : <TermsBody />}
        </div>
      </div>
    </div>
  );
}
