"use client";

import { useRef, useState } from "react";
import { FileText, Upload } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export function Dropzone({
  acceptLabel,
  onFiles,
  compact,
}: {
  acceptLabel: string;
  onFiles: (files: FileList | File[]) => void;
  compact?: boolean;
}) {
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label="Add files"
      onClick={() => inputRef.current?.click()}
      onKeyDown={(e) => {
        if (e.key === "Enter") inputRef.current?.click();
      }}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        if (e.dataTransfer.files.length) onFiles(e.dataTransfer.files);
      }}
      className={cn(
        "rounded-2xl border-2 border-dashed text-center transition-colors",
        compact ? "p-5" : "p-6 sm:p-8",
        dragOver
          ? "border-surf-500 bg-surf-500/10"
          : "border-ocean-500/25 bg-white/50 hover:border-surf-500/60 dark:border-white/10 dark:bg-twilight-400/40",
      )}
    >
      <FileText
        className="mx-auto mb-2 h-8 w-8 opacity-50"
        strokeWidth={1.5}
        aria-hidden
      />
      <p className="font-upload text-sm font-semibold">
        {dragOver ? "Release to add files" : "Drag and drop files here, or click to browse"}
      </p>
      <p className="mt-1 font-upload text-xs opacity-60">{acceptLabel}</p>
      <input
        ref={inputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.length) onFiles(e.target.files);
          e.target.value = "";
        }}
      />
      <span className="sr-only">
        <Upload aria-hidden />
      </span>
    </div>
  );
}
