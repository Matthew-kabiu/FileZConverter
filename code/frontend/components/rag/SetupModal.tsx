"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Lock, Mail, User, X } from "lucide-react";
import { apiClient, ApiClientError } from "@/lib/api/apiClient";
import { useDismiss } from "@/hooks/useDismiss";
import { SignInForm } from "@/components/auth/SignInForm";
import {
  IconField,
  PasswordField,
  validateConfirm,
  validateEmail,
  validatePassword,
  validateRequired,
} from "@/components/auth/fields";

type Mode = "signin" | "bootstrap" | "error";

/** First-run bootstrap form: confirm password + inline validation, all required. */
function BootstrapFormFields({ onDone }: { onDone: () => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState<{
    name?: string;
    email?: string;
    password?: string;
    confirm?: string;
    form?: string;
  }>({});
  const [working, setWorking] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const next = {
      name: validateRequired(name, "Name") ?? undefined,
      email: validateEmail(email) ?? undefined,
      password: validatePassword(password) ?? undefined,
      confirm: validateConfirm(password, confirm) ?? undefined,
    };
    setErrors(next);
    if (next.name || next.email || next.password || next.confirm) return;
    setWorking(true);
    try {
      await apiClient.setup.bootstrap({
        name: name.trim(),
        email: email.trim(),
        password,
      });
      onDone();
    } catch (err) {
      setErrors({
        form: err instanceof ApiClientError ? err.userMessage : "Setup failed. Try again.",
      });
    } finally {
      setWorking(false);
    }
  };

  const clear = (key: keyof typeof errors) =>
    setErrors((p) => ({ ...p, [key]: undefined, form: undefined }));

  return (
    <form onSubmit={submit} className="space-y-3" noValidate>
      <IconField
        id="modal-setup-name"
        label="Name"
        icon={<User size={16} aria-hidden />}
        type="text"
        required
        autoComplete="name"
        value={name}
        onChange={(e) => {
          setName(e.target.value);
          clear("name");
        }}
        error={errors.name}
      />
      <IconField
        id="modal-setup-email"
        label="Email"
        icon={<Mail size={16} aria-hidden />}
        type="email"
        required
        autoComplete="email"
        value={email}
        onChange={(e) => {
          setEmail(e.target.value);
          clear("email");
        }}
        error={errors.email}
      />
      <PasswordField
        id="modal-setup-password"
        label="Password (min 12 chars)"
        required
        autoComplete="new-password"
        value={password}
        onChange={(e) => {
          setPassword(e.target.value);
          clear("password");
        }}
        error={errors.password}
      />
      <PasswordField
        id="modal-setup-confirm"
        label="Confirm password"
        required
        autoComplete="new-password"
        value={confirm}
        onChange={(e) => {
          setConfirm(e.target.value);
          clear("confirm");
        }}
        error={errors.confirm}
      />
      {errors.form && (
        <p role="alert" className="text-sm text-red-500">
          {errors.form}
        </p>
      )}
      <button
        type="submit"
        disabled={working}
        className="h-11 w-full cursor-pointer rounded-xl bg-gradient-to-r from-ocean-500 to-surf-500 font-display text-sm font-semibold text-white disabled:opacity-60"
      >
        {working ? "Creating…" : "Create admin account"}
      </button>
    </form>
  );
}

/**
 * Setup modal: bootstrap (first run, no users yet) or sign-in. Guest chat opens
 * it only when authentication is explicitly requested.
 */
export function SetupModal({ onClose, onAuthed }: { onClose: () => void; onAuthed: () => void }) {
  const [mode, setMode] = useState<Mode | null>(null);
  const [justCreated, setJustCreated] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);
  useDismiss(ref, onClose, true);

  const resolveMode = useCallback(async () => {
    setMode(null);
    try {
      const status = await apiClient.setup.status();
      setMode(status.bootstrapNeeded ? "bootstrap" : "signin");
    } catch {
      // Never guess the mode from a failed check — a timed-out status used
      // to land users on sign-in with zero accounts existing.
      setMode("error");
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void resolveMode(), 0);
    return () => window.clearTimeout(timer);
  }, [resolveMode]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="presentation"
    >
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={mode === "bootstrap" ? "First-run setup" : "Sign in"}
        onClick={(e) => e.stopPropagation()}
        className="w-[min(100%,26rem)] rounded-2xl border border-ocean-500/20 bg-white p-5 shadow-2xl sm:p-6 dark:border-white/10 dark:bg-twilight-300"
      >
        <div className="mb-3 flex items-start justify-between gap-2">
          <div>
            <h2 className="font-display text-xl font-bold tracking-tight">
              {mode === "bootstrap" ? "First-run setup" : "Sign in"}
            </h2>
            <p className="mt-1 text-sm opacity-70">
              {mode === "bootstrap"
                ? "Create the admin account. Afterwards signup closes and this locks."
                : justCreated
                  ? "Admin created — sign in with your new credentials to meet Snow."
                  : "Meet Snow — your document assistant."}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="inline-flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg opacity-70 transition-colors hover:bg-ocean-500/10 hover:opacity-100"
          >
            <X size={16} aria-hidden />
          </button>
        </div>
        {mode === null ? (
          <p className="text-sm opacity-60">Loading…</p>
        ) : mode === "error" ? (
          <div>
            <p className="text-sm opacity-80">
              Couldn&apos;t reach setup — the server took too long. Nothing was
              decided; your accounts are untouched.
            </p>
            <button
              type="button"
              onClick={resolveMode}
              className="mt-3 h-10 w-full cursor-pointer rounded-xl bg-gradient-to-r from-ocean-500 to-surf-500 font-display text-sm font-semibold text-white"
            >
              Retry
            </button>
          </div>
        ) : mode === "bootstrap" ? (
          <BootstrapFormFields
            onDone={() => {
              setJustCreated(true);
              setMode("signin");
            }}
          />
        ) : (
          <>
            <SignInForm onDone={onAuthed} />
            <p className="mt-3 flex items-center gap-1.5 text-xs opacity-60">
              <Lock size={12} aria-hidden />
              Forgot your password? Ask the admin for a reset link.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
