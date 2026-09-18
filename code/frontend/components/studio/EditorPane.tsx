"use client";

import { FilePen } from "lucide-react";
import { StudioCard } from "@/components/studio/StudioShell";

export function EditorPane({
  label,
  value,
  onChange,
  lineCount,
  onLoadExample,
  toolbar,
  inputRef,
  rows = 18,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  lineCount: boolean;
  onLoadExample?: () => void;
  toolbar?: React.ReactNode;
  inputRef?: React.RefObject<HTMLTextAreaElement | null>;
  rows?: number;
}) {
  const lines = value === "" ? 0 : value.split("\n").length;
  return (
    <StudioCard
      title={label}
      icon={<FilePen size={17} aria-hidden />}
      action={
        <div className="flex items-center gap-2">
          {lineCount && (
            <span className="text-xs opacity-60">
              {lines} line{lines === 1 ? "" : "s"}
            </span>
          )}
          {onLoadExample && (
            <button
              type="button"
              onClick={onLoadExample}
              className="rounded-lg border border-ocean-500/25 px-2.5 py-1 text-xs font-medium transition-colors hover:bg-ocean-500/10 dark:border-white/15"
            >
              Load Example Content
            </button>
          )}
        </div>
      }
    >
      <label className="sr-only" htmlFor="studio-editor">
        {label}
      </label>
      {toolbar}
      <textarea
        id="studio-editor"
        ref={inputRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        spellCheck={false}
        className="w-full resize-y rounded-xl border border-ocean-500/15 bg-twilight-200/[0.03] p-3 font-mono text-[13px] leading-relaxed outline-none focus:border-surf-500/60 dark:border-white/10 dark:bg-black/20"
      />
    </StudioCard>
  );
}
