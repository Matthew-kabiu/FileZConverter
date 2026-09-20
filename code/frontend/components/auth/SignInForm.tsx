"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth/client";
import { notify } from "@/components/feedback/toast";
import { IconField, PasswordField, validateEmail } from "@/components/auth/fields";
import { LoaderCircle, LogIn, Mail } from "lucide-react";

/** Shared sign-in form: icons, visibility toggle, required, inline validation. */
export function SignInForm({ onDone }: { onDone: () => void }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ email?: string; password?: string; form?: string }>({});
  const [working, setWorking] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const next = {
      email: validateEmail(email) ?? undefined,
      password: !password ? "Password is required." : undefined,
    };
    setErrors(next);
    if (next.email || next.password) return;
    setWorking(true);
    try {
      // No callbackURL on purpose: better-auth hard-navigates to it via
      // window.location, which would wipe in-memory studio documents.
      // Session state propagates via useSession; onDone refreshes the rest.
      const { error } = await authClient.signIn.email({
        email: email.trim(),
        password,
      });
      if (error) {
        setErrors({ form: "Invalid credentials." });
        return;
      }
      notify.success("Signed in successfully.");
      onDone();
      router.refresh();
    } catch {
      setErrors({ form: "Sign-in failed. Try again." });
    } finally {
      setWorking(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-3" noValidate>
      <IconField
        id="shared-signin-email"
        label="Email"
        icon={<Mail size={16} aria-hidden />}
        type="email"
        required
        autoComplete="email"
        value={email}
        onChange={(e) => {
          setEmail(e.target.value);
          setErrors((p) => ({ ...p, email: undefined, form: undefined }));
        }}
        error={errors.email}
      />
      <PasswordField
        id="shared-signin-password"
        label="Password"
        required
        autoComplete="current-password"
        value={password}
        onChange={(e) => {
          setPassword(e.target.value);
          setErrors((p) => ({ ...p, password: undefined, form: undefined }));
        }}
        error={errors.password}
      />
      {errors.form && (
        <p role="alert" className="text-sm text-red-500">
          {errors.form}
        </p>
      )}
      <button
        type="submit"
        disabled={working}
        className="inline-flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-ocean-500 to-surf-500 font-display text-sm font-semibold text-white shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-ocean-500/20 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 disabled:hover:shadow-sm"
      >
        {working ? (
          <LoaderCircle size={16} className="animate-spin" aria-hidden />
        ) : (
          <LogIn size={16} aria-hidden />
        )}
        {working ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
