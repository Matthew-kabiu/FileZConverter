"use client";

import { useState } from "react";
import { LoaderCircle, SendHorizonal, X } from "lucide-react";
import { env } from "@/lib/config/env";
import { notify } from "@/components/feedback/toast";
import { cn } from "@/lib/utils/cn";
import {
  SUPPORT_TYPES,
  buildSupportPayload,
  validateSupportEmail,
  validateSupportInput,
  type SupportType,
} from "@/lib/support/support";

/**
 * Support / feedback form (inspo: Submit Feedback modal). Posts to the
 * n8n webhook in NEXT_PUBLIC_SUPPORT_WEBHOOK_URL — no account needed.
 */
export function SupportForm({ onClose }: { onClose: () => void }) {
  const [type, setType] = useState<SupportType>("bug");
  const [description, setDescription] = useState("");
  const [email, setEmail] = useState("");
  const [errors, setErrors] = useState<{ description?: string; email?: string; form?: string }>({});
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const webhookUrl = env.NEXT_PUBLIC_SUPPORT_WEBHOOK_URL;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (sending || sent) return;
    const next = {
      description: validateSupportInput(description) ?? undefined,
      email: validateSupportEmail(email) ?? undefined,
    };
    setErrors(next);
    if (next.description || next.email) return;

    if (!webhookUrl) {
      setErrors({ form: "Support inbox isn't configured on this instance yet — please try again later." });
      return;
    }

    setSending(true);
    try {
      const res = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          buildSupportPayload({
            type,
            description,
            email,
            page: window.location.href,
          }),
        ),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setSent(true);
      notify.success("Feedback sent — thank you.");
    } catch {
      setErrors({ form: "Couldn't reach the support inbox. Check your connection and try again." });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 items-start justify-between gap-2 border-b border-ocean-500/10 px-4 py-3 dark:border-white/10">
        <div className="min-w-0">
          <h2 className="font-display text-base font-semibold tracking-tight">
            Submit Feedback
          </h2>
          <p className="mt-0.5 text-[11px] tracking-[0.14em] opacity-60">
            SHARE A BUG, IMPROVEMENT IDEA, OR FEATURE REQUEST
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close support form"
          className="inline-flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg opacity-70 transition-colors hover:bg-ocean-500/10 hover:opacity-100"
        >
          <X size={16} aria-hidden />
        </button>
      </div>

      {sent ? (
        <div className="px-4 py-6 text-center">
          <p className="font-display text-base font-semibold">Received.</p>
          <p className="mx-auto mt-2 max-w-64 text-sm opacity-70">
            Your {type === "bug" ? "bug report" : type === "feature" ? "feature request" : "improvement idea"} is
            with the team. We&apos;ll follow up by email if you left one.
          </p>
          <button
            type="button"
            onClick={onClose}
            className="mt-4 h-10 cursor-pointer rounded-xl bg-gradient-to-r from-ocean-500 to-surf-500 px-6 font-display text-sm font-semibold text-white"
          >
            Done
          </button>
        </div>
      ) : (
        <form onSubmit={submit} className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4" noValidate>
          <fieldset>
            <legend className="text-sm font-medium">Type</legend>
            <div className="mt-2 grid grid-cols-3 gap-2" role="radiogroup" aria-label="Feedback type">
              {SUPPORT_TYPES.map((t) => {
                const active = type === t.value;
                return (
                  <button
                    key={t.value}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => setType(t.value)}
                    className={cn(
                      "h-10 cursor-pointer rounded-xl border font-display text-xs font-semibold tracking-wide uppercase transition-all",
                      active
                        ? "border-transparent bg-gradient-to-r from-ocean-500 to-surf-500 text-white shadow-sm"
                        : "border-ocean-500/20 opacity-70 hover:opacity-100 dark:border-white/15",
                    )}
                  >
                    {t.label}
                  </button>
                );
              })}
            </div>
          </fieldset>

          <div>
            <label htmlFor="support-description" className="text-sm font-medium">
              <span aria-hidden className="mr-0.5 text-red-500">*</span>
              Description
            </label>
            <textarea
              id="support-description"
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                setErrors((p) => ({ ...p, description: undefined, form: undefined }));
              }}
              placeholder="Tell us what happened or what you're thinking…"
              rows={4}
              required
              className="mt-2 min-h-28 w-full resize-y rounded-xl border border-ocean-500/20 bg-transparent px-3 py-2.5 text-sm outline-none placeholder:opacity-50 focus:border-surf-500/60 dark:border-white/15"
            />
            {errors.description && (
              <p role="alert" className="mt-1.5 text-sm text-red-500">
                {errors.description}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="support-email" className="text-sm font-medium">
              Email (optional)
            </label>
            <input
              id="support-email"
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setErrors((p) => ({ ...p, email: undefined, form: undefined }));
              }}
              placeholder="Enter your email address"
              autoComplete="email"
              className="mt-2 h-11 w-full rounded-xl border border-ocean-500/20 bg-transparent px-3 text-sm outline-none placeholder:opacity-50 focus:border-surf-500/60 dark:border-white/15"
            />
            {errors.email && (
              <p role="alert" className="mt-1.5 text-sm text-red-500">
                {errors.email}
              </p>
            )}
          </div>

          {errors.form && (
            <p role="alert" className="text-sm text-red-500">
              {errors.form}
            </p>
          )}

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="h-10 cursor-pointer rounded-xl px-4 font-display text-sm font-medium opacity-80 transition-opacity hover:opacity-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={sending}
              className="inline-flex h-10 cursor-pointer items-center gap-1.5 rounded-xl bg-gradient-to-r from-ocean-500 to-surf-500 px-5 font-display text-sm font-semibold text-white disabled:opacity-60"
            >
              {sending ? (
                <LoaderCircle size={15} className="animate-spin" aria-hidden />
              ) : (
                <SendHorizonal size={15} aria-hidden />
              )}
              {sending ? "Sending…" : "Submit"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
