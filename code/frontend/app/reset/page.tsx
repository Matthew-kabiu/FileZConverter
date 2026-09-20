"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertCircle, ArrowLeft, CheckCircle2, LoaderCircle, LogIn, Save } from "lucide-react";
import { apiClient, ApiClientError } from "@/lib/api/apiClient";
import { authClient } from "@/lib/auth/client";
import { ROUTES } from "@/lib/routes";
import { PasswordField, validateConfirm, validatePassword } from "@/components/auth/fields";
import { notify } from "@/components/feedback/toast";
import { PanelModalShell } from "@/components/ui/PanelModalShell";
import { SignInForm } from "@/components/auth/SignInForm";

interface SessionUser {
  role?: string | null;
}

/** Public reset page: consumes an Option-B link (?token=). Oracle-free messaging. */
function ResetForm() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [done, setDone] = useState(false);
  const [showSignIn, setShowSignIn] = useState(false);
  const [sessionUser, setSessionUser] = useState<SessionUser | null>(null);
  const [errors, setErrors] = useState<{
    password?: string;
    confirm?: string;
    form?: string;
  }>({});
  const [working, setWorking] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const next = {
      password: validatePassword(password) ?? undefined,
      confirm: validateConfirm(password, confirm) ?? undefined,
    };
    setErrors(next);
    if (next.password || next.confirm) return;
    setWorking(true);
    try {
      await apiClient.setup.redeemReset({ token, password });
      try {
        const currentSession = await authClient.getSession();
        setSessionUser((currentSession.data?.user as SessionUser | undefined) ?? null);
      } catch {
        setSessionUser(null);
      }
      setDone(true);
      notify.success("Reset request processed.");
    } catch (err) {
      setErrors({
        form: err instanceof ApiClientError ? err.userMessage : "Reset failed. Try again.",
      });
      notify.error(err, "Reset failed. Try again.");
    } finally {
      setWorking(false);
    }
  };

  if (!token) {
    return (
      <div className="text-center">
        <span className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-xl bg-red-500/10 text-red-500">
          <AlertCircle size={22} aria-hidden />
        </span>
        <p className="mt-4 text-sm font-semibold">This reset link is incomplete.</p>
        <p className="mt-1 text-sm opacity-70">Ask an administrator to issue a new link.</p>
      </div>
    );
  }
  if (done && showSignIn) {
    return (
      <div>
        <h2 className="font-display text-xl font-bold">Sign in</h2>
        <p className="mt-1 text-sm opacity-70">Use your email and new password to continue.</p>
        <div className="mt-4">
          <SignInForm
            onDone={() => {
              router.replace(ROUTES.pages.home);
              router.refresh();
            }}
          />
        </div>
      </div>
    );
  }
  if (done) {
    const returnTo =
      sessionUser?.role === "admin" ? ROUTES.pages.adminUsers : ROUTES.pages.home;
    return (
      <div className="text-center">
        <span className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500">
          <CheckCircle2 size={22} aria-hidden />
        </span>
        <h2 className="mt-4 font-display text-xl font-bold">Reset request complete</h2>
        <p className="mt-2 text-sm leading-relaxed opacity-75">
          If the link was valid, your password was updated. Links are
          single-use and expire after 30 minutes.
        </p>
        {sessionUser ? (
          <Link
            href={returnTo}
            className="mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-ocean-500 to-surf-500 font-display text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg hover:shadow-ocean-500/20 active:translate-y-0"
          >
            <ArrowLeft size={16} aria-hidden />
            {sessionUser.role === "admin" ? "Return to admin" : "Return to app"}
          </Link>
        ) : (
          <button
            type="button"
            onClick={() => setShowSignIn(true)}
            className="mt-5 inline-flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-ocean-500 to-surf-500 font-display text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg hover:shadow-ocean-500/20 active:translate-y-0"
          >
            <LogIn size={16} aria-hidden />
            Sign in
          </button>
        )}
      </div>
    );
  }
  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <PasswordField
        id="reset-password"
        label="New password"
        placeholder="At least 12 characters"
        required
        minLength={12}
        autoComplete="new-password"
        value={password}
        onChange={(e) => {
          setPassword(e.target.value);
          setErrors((current) => ({ ...current, password: undefined, form: undefined }));
        }}
        error={errors.password}
      />
      <PasswordField
        id="reset-password-confirm"
        label="Confirm new password"
        placeholder="Repeat your new password"
        required
        minLength={12}
        autoComplete="new-password"
        value={confirm}
        onChange={(e) => {
          setConfirm(e.target.value);
          setErrors((current) => ({ ...current, confirm: undefined, form: undefined }));
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
        className="inline-flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-ocean-500 to-surf-500 font-display text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg hover:shadow-ocean-500/20 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {working ? (
          <LoaderCircle size={16} className="animate-spin" aria-hidden />
        ) : (
          <Save size={16} aria-hidden />
        )}
        {working ? "Updating…" : "Update password"}
      </button>
    </form>
  );
}

export default function ResetPage() {
  return (
    <PanelModalShell
      title="Reset password"
      subtitle="Choose a new password for your account. This link can only be used once."
    >
      <div className="mx-auto max-w-md py-1">
        <Suspense fallback={<p className="text-sm opacity-60">Loading reset link…</p>}>
          <ResetForm />
        </Suspense>
      </div>
    </PanelModalShell>
  );
}
