"use client";

import type { RefObject } from "react";
import {
  Bold,
  Code,
  Heading1,
  Heading2,
  Heading3,
  Italic,
  Link,
  List,
  ListOrdered,
  Quote,
  Table,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";

type Ctx = {
  el: HTMLTextAreaElement | null;
  value: string;
  onChange: (value: string) => void;
};

function reselect(el: HTMLTextAreaElement | null, start: number, end: number) {
  requestAnimationFrame(() => {
    if (!el) return;
    el.focus();
    el.setSelectionRange(start, end);
  });
}

function wrap(ctx: Ctx, before: string, after: string, placeholder = "text") {
  const { el, value, onChange } = ctx;
  if (!el) return;
  const s = el.selectionStart;
  const e = el.selectionEnd;
  const selected = value.slice(s, e) || placeholder;
  onChange(value.slice(0, s) + before + selected + after + value.slice(e));
  reselect(el, s + before.length, s + before.length + selected.length);
}

function prefixLines(ctx: Ctx, prefix: string | ((n: number) => string)) {
  const { el, value, onChange } = ctx;
  if (!el) return;
  const s = el.selectionStart;
  const e = el.selectionEnd;
  const start = value.lastIndexOf("\n", s - 1) + 1;
  const end = value.indexOf("\n", e);
  const block = value.slice(start, end === -1 ? undefined : end);
  const replaced = block
    .split("\n")
    .map((line, n) =>
      typeof prefix === "string" ? `${prefix}${line}` : `${prefix(n)}${line}`,
    )
    .join("\n");
  onChange(
    value.slice(0, start) + replaced + value.slice(end === -1 ? undefined : end),
  );
  reselect(el, start, start + replaced.length);
}

function insertTable(ctx: Ctx) {
  const { el, value, onChange } = ctx;
  const pos = el ? el.selectionStart : value.length;
  const table = "\n| Header 1 | Header 2 |\n| --- | --- |\n| Cell 1 | Cell 2 |\n";
  onChange(`${value.slice(0, pos)}${table}${value.slice(pos)}`);
  reselect(el, pos + table.length, pos + table.length);
}

/**
 * Markdown formatting controls bound to a textarea. Selection-based,
 * dependency-free. Every control is icon-only with tooltip + aria-label.
 */
export function MdToolbar({
  value,
  onChange,
  inputRef,
}: {
  value: string;
  onChange: (value: string) => void;
  inputRef: RefObject<HTMLTextAreaElement | null>;
}) {
  const controls: {
    label: string;
    tip: string;
    Icon: typeof Bold;
    act: (ctx: Ctx) => void;
  }[] = [
    { label: "Bold", tip: "Bold", Icon: Bold, act: (c) => wrap(c, "**", "**") },
    { label: "Italic", tip: "Italic", Icon: Italic, act: (c) => wrap(c, "*", "*") },
    { label: "Heading 1", tip: "Heading 1", Icon: Heading1, act: (c) => prefixLines(c, "# ") },
    { label: "Heading 2", tip: "Heading 2", Icon: Heading2, act: (c) => prefixLines(c, "## ") },
    { label: "Heading 3", tip: "Heading 3", Icon: Heading3, act: (c) => prefixLines(c, "### ") },
    { label: "Bulleted list", tip: "Bulleted list", Icon: List, act: (c) => prefixLines(c, "- ") },
    {
      label: "Numbered list",
      tip: "Numbered list",
      Icon: ListOrdered,
      act: (c) => prefixLines(c, (n) => `${n + 1}. `),
    },
    { label: "Quote", tip: "Blockquote", Icon: Quote, act: (c) => prefixLines(c, "> ") },
    { label: "Code", tip: "Inline code", Icon: Code, act: (c) => wrap(c, "`", "`", "code") },
    { label: "Link", tip: "Link", Icon: Link, act: (c) => wrap(c, "[", "](https://)", "link text") },
    { label: "Table", tip: "Insert table", Icon: Table, act: (c) => insertTable(c) },
  ];

  return (
    <div
      role="toolbar"
      aria-label="Markdown formatting"
      className="mb-2 flex flex-wrap items-center gap-1 rounded-xl border border-ocean-500/15 bg-white/50 p-1.5 dark:border-white/10 dark:bg-black/20"
    >
      {controls.map(({ label, tip, Icon, act }) => (
        <button
          key={label}
          type="button"
          onClick={() =>
            act({ el: inputRef.current, value, onChange })
          }
          aria-label={label}
          data-tooltip-id="app-tooltip"
          data-tooltip-content={tip}
          className={cn(
            "inline-flex h-8 w-8 items-center justify-center rounded-lg",
            "opacity-70 transition-colors hover:bg-ocean-500/10 hover:opacity-100",
            "focus-visible:outline-2 focus-visible:outline-offset-1",
          )}
        >
          <Icon size={15} aria-hidden />
        </button>
      ))}
    </div>
  );
}
