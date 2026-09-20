"use client";

import { useCallback, useEffect, useState } from "react";
import { KeyRound, LoaderCircle, Save, Trash2 } from "lucide-react";
import { apiClient, ApiClientError } from "@/lib/api/apiClient";
import { Select, type SelectOption } from "@/components/ui/Select";
import { notify } from "@/components/feedback/toast";

interface VaultEntry {
  provider: string;
  label: string | null;
  updatedAt: number;
}

interface AiPrefs {
  chatProvider: string | null;
  chatModel: string | null;
  embedProvider: string | null;
  embedModel: string | null;
}

interface RagSession {
  sessionId: string;
  studios: string[];
  chunks: number;
}

const CHAT_PROVIDERS = ["openai", "openrouter", "anthropic", "gemini"] as const;
const EMBED_PROVIDERS = ["local", "openai", "gemini"] as const;
const PROVIDER_LABELS: Record<string, string> = {
  local: "Local",
  openai: "OpenAI",
  openrouter: "OpenRouter",
  anthropic: "Anthropic",
  gemini: "Google Gemini",
};
const LOCAL_EMBED_MODELS = [
  "onnx-community/all-MiniLM-L6-v2-ONNX",
  "onnx-community/bge-small-en-v1.5-ONNX",
  "Xenova/paraphrase-multilingual-MiniLM-L12-v2",
] as const;
const LOCAL_MODEL_OPTIONS: SelectOption[] = [
  {
    value: LOCAL_EMBED_MODELS[0],
    label: "MiniLM L6 v2",
    detail: "Fast, balanced, on-device",
  },
  {
    value: LOCAL_EMBED_MODELS[1],
    label: "BGE Small EN v1.5",
    detail: "English retrieval, on-device",
  },
  {
    value: LOCAL_EMBED_MODELS[2],
    label: "Multilingual MiniLM L12",
    detail: "Multilingual, on-device",
  },
];

/** AI Setup: provider keys (encrypted vault) + model picks + devices. */
export function AiSetupPanel() {
  const [entries, setEntries] = useState<VaultEntry[]>([]);
  const [devices, setDevices] = useState<RagSession[]>([]);
  const [prefs, setPrefs] = useState<AiPrefs>({
    chatProvider: null,
    chatModel: null,
    embedProvider: "local",
    embedModel: "onnx-community/all-MiniLM-L6-v2-ONNX",
  });
  const [keyForm, setKeyForm] = useState({ provider: "openai", key: "", label: "" });
  const [error, setError] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [vault, prefsData, sessions] = await Promise.all([
        apiClient.setup.providers(),
        apiClient.setup.prefs(),
        apiClient.rag.sessions().catch(() => [] as RagSession[]),
      ]);
      setEntries(vault);
      setDevices(sessions);
      setPrefs((prev) => ({ ...prev, ...prefsData }));
    } catch {
      setError("Failed to load AI setup.");
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const saveKey = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusyAction("save-key");
    try {
      await apiClient.setup.saveProvider({
        provider: keyForm.provider,
        key: keyForm.key,
        label: keyForm.label || undefined,
      });
      setKeyForm({ provider: "openai", key: "", label: "" });
      notify.success(`${PROVIDER_LABELS[keyForm.provider] ?? keyForm.provider} key saved.`);
      await load();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.userMessage : "Failed to save key.");
      notify.error(err, "Failed to save provider key.");
    } finally {
      setBusyAction(null);
    }
  };

  const deleteKey = async (provider: string) => {
    if (!window.confirm(`Delete the ${provider} key? Chat with it stops working.`)) return;
    setError(null);
    setBusyAction(`delete:${provider}`);
    try {
      await apiClient.setup.deleteProvider(provider);
      notify.success(`${PROVIDER_LABELS[provider] ?? provider} key deleted.`);
      await load();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.userMessage : "Failed to delete key.");
      notify.error(err, "Failed to delete provider key.");
    } finally {
      setBusyAction(null);
    }
  };

  const savePrefs = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusyAction("save-models");
    try {
      await apiClient.setup.savePrefs(prefs);
      notify.success("AI model preferences saved.");
    } catch (err) {
      setError(err instanceof ApiClientError ? err.userMessage : "Failed to save preferences.");
      notify.error(err, "Failed to save model preferences.");
    } finally {
      setBusyAction(null);
    }
  };

  const revokeDevice = async (sessionId: string) => {
    if (!window.confirm("Delete this device's chat memory?")) return;
    setError(null);
    setBusyAction(`revoke:${sessionId}`);
    try {
      await apiClient.rag.revokeSession(sessionId);
      notify.success("Device chat memory revoked.");
      await load();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.userMessage : "Failed to revoke device.");
      notify.error(err, "Failed to revoke device memory.");
    } finally {
      setBusyAction(null);
    }
  };

  const inputCls =
    "h-11 min-w-0 rounded-xl border border-ocean-500/20 bg-transparent px-3 text-sm outline-none transition focus:border-surf-500/60 focus:ring-2 focus:ring-surf-500/15 dark:border-white/10";
  const primaryButton =
    "inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-ocean-500 to-surf-500 font-display text-sm font-semibold text-white shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-ocean-500/20 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-55 disabled:hover:translate-y-0 disabled:hover:shadow-sm";
  const dangerButton =
    "inline-flex h-9 cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-red-500/30 px-3 text-xs font-semibold text-red-500 transition duration-200 hover:-translate-y-0.5 hover:border-red-500/55 hover:bg-red-500/10 hover:shadow-md active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:bg-transparent disabled:hover:shadow-none";
  const keyProviderOptions = CHAT_PROVIDERS.map((provider) => ({
    value: provider,
    label: PROVIDER_LABELS[provider] ?? provider,
    detail: entries.some((entry) => entry.provider === provider)
      ? "Key already saved"
      : "API key required",
  }));
  const chatProviderOptions = [
    { value: "", label: "Not set", detail: "Chat answers are disabled" },
    ...keyProviderOptions,
  ];
  const embedProviderOptions = EMBED_PROVIDERS.map((provider) => ({
    value: provider,
    label: PROVIDER_LABELS[provider] ?? provider,
    detail:
      provider === "local"
        ? "Private, no key required"
        : entries.some((entry) => entry.provider === provider)
          ? "Key saved"
          : "API key required",
  }));

  return (
    <div className="min-w-0 space-y-4">
      {error && (
        <p role="alert" className="text-sm text-red-500">
          {error}
        </p>
      )}
      <section className="rounded-2xl border border-ocean-500/15 bg-white/80 p-4 dark:border-white/10 dark:bg-twilight-300/70">
        <h2 className="font-display text-lg font-semibold">Provider keys</h2>
        <p className="mt-1 text-xs opacity-70">
          Stored encrypted (AES-256-GCM). Local embeddings need no key.
        </p>
        <ul className="mt-2 space-y-1">
          {entries.length === 0 && (
            <li className="text-sm opacity-60">No keys saved yet.</li>
          )}
          {entries.map((e) => (
            <li
              key={e.provider}
              className="flex min-w-0 items-center gap-2 rounded-xl px-2 py-2 hover:bg-ocean-500/5"
            >
              <span className="min-w-0 flex-1 truncate text-sm font-medium">
                {PROVIDER_LABELS[e.provider] ?? e.provider}
                {e.label ? ` · ${e.label}` : ""}
              </span>
              <button
                type="button"
                onClick={() => deleteKey(e.provider)}
                disabled={busyAction !== null}
                className={dangerButton}
              >
                {busyAction === `delete:${e.provider}` ? (
                  <LoaderCircle size={14} className="animate-spin" aria-hidden />
                ) : (
                  <Trash2 size={14} aria-hidden />
                )}
                {busyAction === `delete:${e.provider}` ? "Deleting…" : "Delete"}
              </button>
            </li>
          ))}
        </ul>
        <form onSubmit={saveKey} className="mt-3 grid gap-2 sm:grid-cols-2">
          <div>
            <label htmlFor="provider-key-service" className="block text-xs font-medium">
              Provider
            </label>
            <Select
              id="provider-key-service"
              value={keyForm.provider}
              onChange={(provider) => setKeyForm({ ...keyForm, provider })}
              options={keyProviderOptions}
              ariaLabel="Provider"
              className="mt-1"
            />
          </div>
          <label className="block text-xs font-medium">
            Label <span className="opacity-55">(optional)</span>
            <input
              placeholder="e.g. Personal"
              value={keyForm.label}
              onChange={(e) => setKeyForm({ ...keyForm, label: e.target.value })}
              className={`${inputCls} mt-1 w-full`}
            />
          </label>
          <label className="block text-xs font-medium sm:col-span-2">
            API key
            <input
              placeholder="Paste provider key"
              type="password"
              required
              autoComplete="off"
              value={keyForm.key}
              onChange={(e) => setKeyForm({ ...keyForm, key: e.target.value })}
              className={`${inputCls} mt-1 w-full`}
            />
          </label>
          <button
            type="submit"
            disabled={busyAction !== null}
            className={`${primaryButton} sm:col-span-2`}
          >
            {busyAction === "save-key" ? (
              <LoaderCircle size={16} className="animate-spin" aria-hidden />
            ) : (
              <KeyRound size={16} aria-hidden />
            )}
            {busyAction === "save-key" ? "Saving key…" : "Save key"}
          </button>
        </form>
      </section>

      <section className="rounded-2xl border border-ocean-500/15 bg-white/80 p-4 dark:border-white/10 dark:bg-twilight-300/70">
        <h2 className="font-display text-lg font-semibold">Models</h2>
        <p className="mt-1 text-xs opacity-70">
          Chat needs a saved key for its provider. Embeddings default to local MiniLM (free, private).
        </p>
        <form onSubmit={savePrefs} className="mt-3 grid gap-2 sm:grid-cols-2">
          <div>
            <label htmlFor="chat-provider" className="block text-xs font-medium">
              Chat provider
            </label>
            <Select
              id="chat-provider"
              value={prefs.chatProvider ?? ""}
              onChange={(provider) => setPrefs({ ...prefs, chatProvider: provider || null })}
              options={chatProviderOptions}
              ariaLabel="Chat provider"
              className="mt-1"
            />
          </div>
          <label className="block text-xs font-medium">
            Chat model
            <input
              placeholder={
                prefs.chatProvider === "openrouter"
                  ? "e.g. openai/gpt-4o-mini"
                  : "e.g. gpt-4o-mini"
              }
              value={prefs.chatModel ?? ""}
              onChange={(e) => setPrefs({ ...prefs, chatModel: e.target.value || null })}
              className={`${inputCls} mt-1 w-full`}
            />
          </label>
          <div>
            <label htmlFor="embedding-provider" className="block text-xs font-medium">
              Embeddings provider
            </label>
            <Select
              id="embedding-provider"
              value={prefs.embedProvider ?? "local"}
              onChange={(provider) => setPrefs({ ...prefs, embedProvider: provider })}
              options={embedProviderOptions}
              ariaLabel="Embeddings provider"
              className="mt-1"
            />
          </div>
          <div>
            <label htmlFor="embedding-model" className="block text-xs font-medium">
              Embeddings model
            </label>
            {prefs.embedProvider === "local" ? (
              <Select
                id="embedding-model"
                value={prefs.embedModel ?? LOCAL_EMBED_MODELS[0]}
                onChange={(model) => setPrefs({ ...prefs, embedModel: model })}
                options={LOCAL_MODEL_OPTIONS}
                ariaLabel="Embeddings model"
                className="mt-1"
              />
            ) : (
              <input
                id="embedding-model"
                placeholder="e.g. text-embedding-3-small"
                value={prefs.embedModel ?? ""}
                onChange={(e) =>
                  setPrefs({ ...prefs, embedModel: e.target.value || null })
                }
                className={`${inputCls} mt-1 w-full`}
              />
            )}
          </div>
          <button
            type="submit"
            disabled={busyAction !== null}
            className={`${primaryButton} sm:col-span-2`}
          >
            {busyAction === "save-models" ? (
              <LoaderCircle size={16} className="animate-spin" aria-hidden />
            ) : (
              <Save size={16} aria-hidden />
            )}
            {busyAction === "save-models" ? "Saving models…" : "Save models"}
          </button>
        </form>
      </section>

      <section className="rounded-2xl border border-ocean-500/15 bg-white/80 p-4 dark:border-white/10 dark:bg-twilight-300/70">
        <h2 className="font-display text-lg font-semibold">Devices with chat memory</h2>
        <p className="mt-1 text-xs opacity-70">
          Each browser holds its own vectors. Revoking deletes that device&apos;s memory.
        </p>
        <ul className="mt-2 space-y-1">
          {devices.length === 0 && (
            <li className="text-sm opacity-60">No devices holding chat memory.</li>
          )}
          {devices.map((d) => (
            <li
              key={d.sessionId}
              className="flex min-w-0 items-center gap-2 rounded-xl px-2 py-2 hover:bg-ocean-500/5"
            >
              <span className="min-w-0 flex-1 truncate text-sm">
                {d.studios.join(", ") || "studio"} · {d.chunks} chunks
              </span>
              <button
                type="button"
                onClick={() => revokeDevice(d.sessionId)}
                disabled={busyAction !== null}
                className={dangerButton}
              >
                {busyAction === `revoke:${d.sessionId}` ? (
                  <LoaderCircle size={14} className="animate-spin" aria-hidden />
                ) : (
                  <Trash2 size={14} aria-hidden />
                )}
                {busyAction === `revoke:${d.sessionId}` ? "Revoking…" : "Revoke"}
              </button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
