"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiClient, ApiClientError } from "@/lib/api/apiClient";
import { getSignInRoute, ROUTES } from "@/lib/routes";

/** First-run form: creates the initial admin account, then this route locks. */
export function BootstrapForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [working, setWorking] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setWorking(true);
    try {
      await apiClient.setup.bootstrap({ name, email, password });
      router.push(getSignInRoute(ROUTES.pages.adminAi));
    } catch (err) {
      setError(err instanceof ApiClientError ? err.userMessage : "Setup failed. Try again.");
    } finally {
      setWorking(false);
    }
  };

  return (
    <form
      onSubmit={submit}
      className="w-full max-w-md rounded-2xl border border-ocean-500/15 bg-white/80 p-6 shadow-sm dark:border-white/10 dark:bg-twilight-300/70"
    >
      <h1 className="font-display text-2xl font-bold tracking-tight">
        First-run setup
      </h1>
      <p className="mt-1 text-sm opacity-70">
        Create the admin account. Afterwards signup closes and this page locks.
      </p>
      <label className="mt-4 block text-sm font-medium" htmlFor="setup-name">
        Name
      </label>
      <input
        id="setup-name"
        type="text"
        required
        autoComplete="name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="mt-1 h-10 w-full rounded-xl border border-ocean-500/20 bg-transparent px-3 text-sm dark:border-white/10"
      />
      <label className="mt-3 block text-sm font-medium" htmlFor="setup-email">
        Email
      </label>
      <input
        id="setup-email"
        type="email"
        required
        autoComplete="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="mt-1 h-10 w-full rounded-xl border border-ocean-500/20 bg-transparent px-3 text-sm dark:border-white/10"
      />
      <label className="mt-3 block text-sm font-medium" htmlFor="setup-password">
        Password (min 12 chars)
      </label>
      <input
        id="setup-password"
        type="password"
        required
        minLength={12}
        autoComplete="new-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="mt-1 h-10 w-full rounded-xl border border-ocean-500/20 bg-transparent px-3 text-sm dark:border-white/10"
      />
      {error && (
        <p role="alert" className="mt-3 text-sm text-red-500">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={working}
        className="mt-4 h-10 w-full cursor-pointer rounded-xl bg-gradient-to-r from-ocean-500 to-surf-500 font-display text-sm font-semibold text-white disabled:opacity-60"
      >
        {working ? "Creating…" : "Create admin account"}
      </button>
    </form>
  );
}
