"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Ban,
  Bot,
  Check,
  Copy,
  KeyRound,
  LoaderCircle,
  Mail,
  ShieldCheck,
  Trash2,
  User,
  UserPlus,
  Users,
} from "lucide-react";
import { apiClient, ApiClientError } from "@/lib/api/apiClient";
import { AiSetupPanel } from "@/app/ai-setup/AiSetupPanel";
import { IconField, PasswordField } from "@/components/auth/fields";
import { notify } from "@/components/feedback/toast";
import { ROUTES } from "@/lib/routes";
import { Select } from "@/components/ui/Select";

interface AdminUser {
  id: string;
  name: string;
  email: string;
  role?: string | null;
  banned?: boolean | null;
  createdAt?: string;
}

type PanelTab = "ai" | "users";

/** Unified AI settings and admin-only user management. */
export function AdminPanel({
  isAdmin,
  initialTab,
}: {
  isAdmin: boolean;
  initialTab: PanelTab;
}) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<PanelTab>(isAdmin ? initialTab : "ai");
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "user" });
  const [creating, setCreating] = useState(false);
  const [resetLink, setResetLink] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; email: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient.admin.users({ limit: 100 });
      setUsers(data.users);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.userMessage : "Failed to load users.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isAdmin || activeTab !== "users") return;
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [activeTab, isAdmin, load]);

  useEffect(() => {
    if (!deleteTarget) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && busyAction !== `delete:${deleteTarget.id}`) {
        setDeleteTarget(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [busyAction, deleteTarget]);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setError(null);
    try {
      await apiClient.admin.createUser(form);
      setForm({ name: "", email: "", password: "", role: "user" });
      notify.success("User created successfully.");
      await load();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.userMessage : "Failed to create user.");
      notify.error(err, "Failed to create user.");
    } finally {
      setCreating(false);
    }
  };

  const setBanned = async (id: string, banned: boolean) => {
    setError(null);
    setBusyAction(`ban:${id}`);
    try {
      await apiClient.admin.setBanned(id, banned);
      notify.success(banned ? "User banned." : "User restored.");
      await load();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.userMessage : "Failed to update user.");
      notify.error(err, "Failed to update user.");
    } finally {
      setBusyAction(null);
    }
  };

  const remove = async () => {
    if (!deleteTarget) return;
    const { id, email } = deleteTarget;
    setError(null);
    setBusyAction(`delete:${id}`);
    try {
      await apiClient.admin.removeUser(id);
      notify.success(`${email} was deleted.`);
      setDeleteTarget(null);
      await load();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.userMessage : "Failed to delete user.");
      notify.error(err, "Failed to delete user.");
    } finally {
      setBusyAction(null);
    }
  };

  const issueReset = async (id: string) => {
    setError(null);
    setResetLink(null);
    setBusyAction(`reset:${id}`);
    try {
      const data = await apiClient.admin.issueReset(id);
      setResetLink(data.resetUrl);
      notify.success("Reset link generated.");
    } catch (err) {
      setError(err instanceof ApiClientError ? err.userMessage : "Failed to issue reset link.");
      notify.error(err, "Failed to issue reset link.");
    } finally {
      setBusyAction(null);
    }
  };

  const copyResetLink = async () => {
    if (!resetLink) return;
    try {
      await navigator.clipboard.writeText(resetLink);
      notify.success("Reset link copied.");
    } catch (err) {
      notify.error(err, "Could not copy the reset link.");
    }
  };

  const actionButton =
    "inline-flex h-9 cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap rounded-lg border px-3 text-xs font-semibold transition duration-200 hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50";

  const selectTab = (tab: PanelTab) => {
    setActiveTab(tab);
    router.replace(tab === "users" ? ROUTES.pages.adminUsers : ROUTES.pages.adminAi);
  };

  return (
    <div className="min-w-0 space-y-5">
      {isAdmin && (
        <div
          role="tablist"
          aria-label="Admin panel sections"
          className="grid grid-cols-2 gap-1 rounded-xl border border-ocean-500/15 bg-ocean-500/5 p-1 dark:border-white/10 dark:bg-white/5"
        >
          <button
            type="button"
            id="admin-tab-ai"
            role="tab"
            aria-selected={activeTab === "ai"}
            aria-controls="admin-panel-ai"
            onClick={() => selectTab("ai")}
            className={`inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-lg text-sm font-semibold transition ${
              activeTab === "ai"
                ? "bg-white text-twilight-300 shadow-sm dark:bg-twilight-300 dark:text-frost-800"
                : "opacity-65 hover:bg-ocean-500/10 hover:opacity-100"
            }`}
          >
            <Bot size={16} aria-hidden />
            AI settings
          </button>
          <button
            type="button"
            id="admin-tab-users"
            role="tab"
            aria-selected={activeTab === "users"}
            aria-controls="admin-panel-users"
            onClick={() => selectTab("users")}
            className={`inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-lg text-sm font-semibold transition ${
              activeTab === "users"
                ? "bg-white text-twilight-300 shadow-sm dark:bg-twilight-300 dark:text-frost-800"
                : "opacity-65 hover:bg-ocean-500/10 hover:opacity-100"
            }`}
          >
            <Users size={16} aria-hidden />
            Users
          </button>
        </div>
      )}

      {activeTab === "ai" || !isAdmin ? (
        <div
          id="admin-panel-ai"
          role="tabpanel"
          aria-labelledby={isAdmin ? "admin-tab-ai" : undefined}
        >
          <AiSetupPanel />
        </div>
      ) : (
        <div
          id="admin-panel-users"
          role="tabpanel"
          aria-labelledby="admin-tab-users"
          className="space-y-5"
        >
      {error && (
        <p role="alert" className="text-sm text-red-500">
          {error}
        </p>
      )}
      {resetLink && (
        <div className="rounded-xl border border-surf-500/40 bg-surf-500/10 p-4">
          <div className="flex items-start gap-3">
            <KeyRound size={18} className="mt-0.5 shrink-0 text-surf-500" aria-hidden />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold">One-time reset link (30 min, single-use)</p>
              <p className="mt-1.5 text-xs break-all">{resetLink}</p>
              <p className="mt-1.5 text-[11px] opacity-70">
                Copy it now. It is never shown again; share it with the user out-of-band.
              </p>
            </div>
            <button
              type="button"
              onClick={copyResetLink}
              aria-label="Copy reset link"
              className="inline-flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-surf-500/30 transition hover:-translate-y-0.5 hover:bg-surf-500/15 hover:shadow-md active:translate-y-0"
            >
              <Copy size={15} aria-hidden />
            </button>
          </div>
        </div>
      )}

      <form
        onSubmit={create}
        className="grid min-w-0 gap-4 rounded-2xl border border-ocean-500/15 bg-white/80 p-5 sm:grid-cols-2 dark:border-white/10 dark:bg-twilight-300/70"
      >
        <h2 className="font-display text-lg font-semibold sm:col-span-2">
          Create user
        </h2>
        <IconField
          id="admin-user-name"
          label="Name"
          icon={<User size={16} aria-hidden />}
          placeholder="Name"
          required
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
        <IconField
          id="admin-user-email"
          label="Email"
          icon={<Mail size={16} aria-hidden />}
          placeholder="Email"
          type="email"
          required
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
        />
        <PasswordField
          id="admin-user-password"
          label="Temporary password"
          placeholder="Temporary password (min 12)"
          required
          minLength={12}
          autoComplete="new-password"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
        />
        <div>
          <label className="block text-sm font-medium" htmlFor="admin-user-role">
            Role
          </label>
          <Select
            id="admin-user-role"
            value={form.role}
            onChange={(role) => setForm({ ...form, role })}
            options={[
              { value: "user", label: "User", detail: "Standard account access" },
              { value: "admin", label: "Admin", detail: "Can manage users and resets" },
            ]}
            ariaLabel="User role"
            className="mt-1"
          />
        </div>
        <button
          type="submit"
          disabled={creating}
          className="inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-ocean-500 to-surf-500 font-display text-sm font-semibold text-white shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-ocean-500/20 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60 sm:col-span-2"
        >
          {creating ? (
            <LoaderCircle size={16} className="animate-spin" aria-hidden />
          ) : (
            <UserPlus size={16} aria-hidden />
          )}
          {creating ? "Creating…" : "Create user"}
        </button>
      </form>

      <div className="min-w-0 rounded-2xl border border-ocean-500/15 bg-white/80 p-5 dark:border-white/10 dark:bg-twilight-300/70">
        <h2 className="font-display text-lg font-semibold">
          Users ({loading ? "…" : users.length})
        </h2>
        <ul className="mt-4 space-y-2">
          {users.map((u) => (
            <li
              key={u.id}
              className="flex min-w-0 flex-col gap-4 rounded-xl border border-ocean-500/10 bg-ocean-500/[0.025] p-4 transition hover:border-ocean-500/25 hover:bg-ocean-500/[0.06] sm:flex-row sm:items-center"
            >
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-ocean-500/10 text-ocean-500">
                  <User size={16} aria-hidden />
                </span>
                <span className="min-w-0">
                  <span className="flex flex-wrap items-center gap-1.5 text-sm font-semibold">
                    {u.name}
                    {u.role === "admin" && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-surf-500/10 px-2 py-0.5 text-[10px] text-surf-500">
                        <ShieldCheck size={10} aria-hidden /> Admin
                      </span>
                    )}
                    {u.banned && (
                      <span className="rounded-full bg-red-500/10 px-2 py-0.5 text-[10px] text-red-500">
                        Banned
                      </span>
                    )}
                  </span>
                  <span className="mt-0.5 block truncate text-xs opacity-65">{u.email}</span>
                </span>
              </div>
              <div className="flex flex-wrap gap-2 sm:justify-end">
                <button
                  type="button"
                  onClick={() => setBanned(u.id, !u.banned)}
                  disabled={busyAction !== null}
                  className={`${actionButton} border-ocean-500/25 hover:border-ocean-500/45 hover:bg-ocean-500/10 dark:border-white/15`}
                >
                  {busyAction === `ban:${u.id}` ? (
                    <LoaderCircle size={14} className="animate-spin" aria-hidden />
                  ) : u.banned ? (
                    <Check size={14} aria-hidden />
                  ) : (
                    <Ban size={14} aria-hidden />
                  )}
                  {u.banned ? "Unban" : "Ban"}
                </button>
                <button
                  type="button"
                  onClick={() => issueReset(u.id)}
                  disabled={busyAction !== null}
                  className={`${actionButton} border-ocean-500/25 hover:border-ocean-500/45 hover:bg-ocean-500/10 dark:border-white/15`}
                >
                  {busyAction === `reset:${u.id}` ? (
                    <LoaderCircle size={14} className="animate-spin" aria-hidden />
                  ) : (
                    <KeyRound size={14} aria-hidden />
                  )}
                  Reset link
                </button>
                <button
                  type="button"
                  onClick={() => setDeleteTarget({ id: u.id, email: u.email })}
                  disabled={busyAction !== null}
                  className={`${actionButton} border-red-500/25 text-red-500 hover:border-red-500/45 hover:bg-red-500/10`}
                >
                  <Trash2 size={14} aria-hidden />
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {deleteTarget && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          onClick={() => {
            if (busyAction !== `delete:${deleteTarget.id}`) setDeleteTarget(null);
          }}
          role="presentation"
        >
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-user-title"
            aria-describedby="delete-user-description"
            onClick={(event) => event.stopPropagation()}
            className="w-[min(100%,28rem)] rounded-2xl border border-red-500/20 bg-white p-6 shadow-2xl dark:bg-twilight-300"
          >
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-red-500/10 text-red-500">
              <Trash2 size={20} aria-hidden />
            </span>
            <h2 id="delete-user-title" className="mt-4 font-display text-xl font-bold">
              Delete this user?
            </h2>
            <p id="delete-user-description" className="mt-2 text-sm leading-relaxed opacity-70">
              <strong className="font-semibold opacity-100">{deleteTarget.email}</strong> will lose
              access immediately. Their vault, reset tokens, sessions, and chat memory will be
              permanently removed.
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                autoFocus
                disabled={busyAction === `delete:${deleteTarget.id}`}
                onClick={() => setDeleteTarget(null)}
                className={`${actionButton} border-ocean-500/20 hover:bg-ocean-500/10 dark:border-white/15`}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={busyAction === `delete:${deleteTarget.id}`}
                onClick={remove}
                className={`${actionButton} border-red-500 bg-red-500 text-white hover:bg-red-600`}
              >
                {busyAction === `delete:${deleteTarget.id}` ? (
                  <LoaderCircle size={14} className="animate-spin" aria-hidden />
                ) : (
                  <Trash2 size={14} aria-hidden />
                )}
                {busyAction === `delete:${deleteTarget.id}` ? "Deleting…" : "Delete user"}
              </button>
            </div>
          </div>
        </div>
      )}
        </div>
      )}
    </div>
  );
}
