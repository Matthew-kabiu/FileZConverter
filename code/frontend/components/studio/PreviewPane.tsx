"use client";

import { useEffect, useState } from "react";
import { Expand, Eye, X } from "lucide-react";
import { StudioCard } from "@/components/studio/StudioShell";
import { EmptyState } from "@/components/feedback/States";

export function PreviewPane({
  label,
  emptyHint,
  action,
  children,
  height = "80vh",
}: {
  label: string;
  emptyHint?: string;
  action?: React.ReactNode;
  children?: React.ReactNode;
  height?: string;
}) {
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!expanded) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setExpanded(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [expanded]);

  return (
    <>
      <StudioCard
        title={label}
        icon={<Eye size={17} aria-hidden />}
        action={
          <span className="flex items-center gap-2">
            {action}
            <button
              type="button"
              onClick={() => setExpanded(true)}
              aria-label={`Open ${label} full page`}
              data-tooltip-id="app-tooltip"
              data-tooltip-content="Open full page"
              className="inline-flex h-7 w-7 items-center justify-center rounded-lg opacity-70 transition-colors hover:bg-ocean-500/10 hover:opacity-100"
            >
              <Expand size={14} aria-hidden />
            </button>
          </span>
        }
      >
        <div
          className="overflow-y-auto rounded-xl border border-ocean-500/15 bg-white/50 p-4 text-sm dark:border-white/10 dark:bg-black/20"
          style={{ height }}
        >
          {expanded ? (
            <p className="flex h-full items-center justify-center text-xs opacity-60">
              Preview is open full page — close it to return here.
            </p>
          ) : (
            children ?? (
              <div className="flex h-full items-center justify-center">
                <EmptyState
                  title="Nothing to preview yet"
                  hint={emptyHint ?? "Upload a file or type content to see it here."}
                />
              </div>
            )
          )}
        </div>
      </StudioCard>

      {expanded && (
        <div
          className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm sm:p-8"
          onClick={() => setExpanded(false)}
          role="presentation"
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={`${label} full page`}
            onClick={(e) => e.stopPropagation()}
            className="w-[85vw] rounded-2xl border border-ocean-500/20 bg-white p-4 shadow-2xl sm:p-6 dark:border-white/10 dark:bg-twilight-300"
          >
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-display text-lg font-semibold">{label}</h2>
              <button
                type="button"
                onClick={() => setExpanded(false)}
                aria-label="Close full page preview"
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg opacity-70 transition-colors hover:bg-ocean-500/10 hover:opacity-100"
              >
                <X size={16} aria-hidden />
              </button>
            </div>
            <div className="max-h-[80vh] overflow-y-auto text-sm">{children}</div>
          </div>
        </div>
      )}
    </>
  );
}
