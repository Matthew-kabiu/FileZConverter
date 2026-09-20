"use client";

import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { ROUTES } from "@/lib/routes";

/** Route-level overlay card capped at 75dvh with internal scrolling. */
export function PanelModalShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const close = () => {
    if (window.history.length > 1) router.back();
    else router.push(ROUTES.pages.home);
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm"
      onClick={close}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[75dvh] w-[min(100%,42rem)] flex-col overflow-hidden rounded-2xl border border-ocean-500/20 bg-white shadow-2xl dark:border-white/10 dark:bg-twilight-300"
      >
        <div className="flex shrink-0 items-start justify-between gap-2 px-5 pt-5 sm:px-6">
          <div className="min-w-0">
            <h1 className="font-display text-2xl font-bold tracking-tight">{title}</h1>
            <p className="mt-1 text-sm opacity-70">{subtitle}</p>
          </div>
          <button
            type="button"
            onClick={close}
            aria-label={`Close ${title}`}
            className="inline-flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg opacity-70 transition-colors hover:bg-ocean-500/10 hover:opacity-100"
          >
            <X size={16} aria-hidden />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 sm:px-6">{children}</div>
      </div>
    </div>
  );
}
