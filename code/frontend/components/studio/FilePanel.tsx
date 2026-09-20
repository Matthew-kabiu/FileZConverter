"use client";

import { useRef } from "react";
import { Plus, X } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export interface PanelFile {
  id: string;
  name: string;
  detail?: string;
}

/**
 * Left file panel: appears once files exist. Switch the active file,
 * remove files, and add more — without leaving the studio.
 */
export function FilePanel({
  files,
  activeId,
  onSelect,
  onRemove,
  onAddMore,
  acceptExts,
  checked,
  onToggleCheck,
  checkLabel,
}: {
  files: PanelFile[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onRemove: (id: string) => void;
  onAddMore: (files: FileList | File[]) => void;
  acceptExts: string[];
  checked?: Record<string, boolean>;
  onToggleCheck?: (id: string) => void;
  checkLabel?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <aside
      aria-label="Uploaded files"
      className="min-w-0 max-w-full rounded-2xl border border-ocean-500/15 bg-white/80 p-3 shadow-sm xl:sticky xl:top-4 xl:w-64 xl:shrink-0 xl:overflow-y-auto dark:border-white/10 dark:bg-twilight-300/70"
    >
      <div className="mb-2 flex items-center justify-between px-1">
        <span className="font-display text-sm font-semibold">
          Files ({files.length})
        </span>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          aria-label="Add more files"
          data-tooltip-id="app-tooltip"
          data-tooltip-content="Add more files"
          className="inline-flex h-7 w-7 items-center justify-center rounded-lg opacity-70 transition-colors hover:bg-ocean-500/10 hover:opacity-100"
        >
          <Plus size={15} aria-hidden />
        </button>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={acceptExts.map((e) => `.${e}`).join(",")}
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.length) onAddMore(e.target.files);
            e.target.value = "";
          }}
        />
      </div>
      <ul className="space-y-1">
        {files.map((f) => (
          <li
            key={f.id}
            onClick={() => onSelect(f.id)}
            onKeyDown={(e) => {
              if (e.key === "Enter") onSelect(f.id);
            }}
            tabIndex={0}
            role="option"
            aria-selected={f.id === activeId}
            className={cn(
              "group flex cursor-pointer items-center gap-2 rounded-xl border px-2 py-2 transition-colors",
              f.id === activeId
                ? "border-ocean-500/40 bg-ocean-500/10"
                : "border-transparent hover:border-ocean-500/20 hover:bg-ocean-500/5",
            )}
          >
            {onToggleCheck && (
              <input
                type="checkbox"
                aria-label={`${checkLabel ?? "Select"} ${f.name}`}
                checked={!!checked?.[f.id]}
                onChange={() => onToggleCheck(f.id)}
                onClick={(e) => e.stopPropagation()}
                className="h-4 w-4 shrink-0 accent-[#0077b6]"
              />
            )}
            <span className="min-w-0 flex-1">
              <span className="block truncate text-xs font-semibold">
                {f.name}
              </span>
              {f.detail && (
                <span className="block truncate text-[10px] opacity-60">
                  {f.detail}
                </span>
              )}
            </span>
            <button
              type="button"
              aria-label={`Remove ${f.name}`}
              onClick={(e) => {
                e.stopPropagation();
                onRemove(f.id);
              }}
              className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md opacity-0 transition-opacity hover:bg-red-500/10 hover:text-red-500 focus-visible:opacity-100 group-hover:opacity-100"
            >
              <X size={13} aria-hidden />
            </button>
          </li>
        ))}
      </ul>
    </aside>
  );
}
