"use client";

import { useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { useDismiss } from "@/hooks/useDismiss";
import { cn } from "@/lib/utils/cn";

export interface SelectOption {
  value: string;
  label: string;
}

/**
 * Designed dropdown (native <option> lists cannot be styled cross-browser).
 * Button + menu match the Tools menu: display font, soft borders, ocean
 * hover wash, gradient check on the active item.
 */
export function Select({
  id,
  value,
  onChange,
  options,
  ariaLabel,
}: {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  ariaLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement | null>(null);
  useDismiss(boxRef, () => setOpen(false), open);

  const current = options.find((o) => o.value === value);

  return (
    <div ref={boxRef} className="relative">
      <button
        id={id}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={ariaLabel}
        className={cn(
          "flex h-10 cursor-pointer items-center gap-2 rounded-xl border px-3",
          "border-ocean-500/20 bg-white/70 font-display text-sm font-medium",
          "transition-colors hover:border-surf-500/60",
          "dark:border-white/10 dark:bg-twilight-300/70",
        )}
      >
        <span className="whitespace-nowrap">{current?.label ?? value}</span>
        <ChevronDown
          size={14}
          aria-hidden
          className={cn("opacity-60 transition-transform", open && "rotate-180")}
        />
      </button>
      {open && (
        <ul
          role="listbox"
          aria-label={ariaLabel}
          className="absolute left-0 top-full z-50 mt-1 min-w-full overflow-hidden rounded-xl border border-ocean-500/15 bg-white py-1.5 font-display shadow-xl dark:border-white/10 dark:bg-twilight-300"
        >
          {options.map((option) => {
            const selected = option.value === value;
            return (
              <li key={option.value} role="option" aria-selected={selected}>
                <button
                  type="button"
                  onClick={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                  className={cn(
                    "flex w-full cursor-pointer items-center justify-between gap-3 whitespace-nowrap px-3 py-1.5 text-left text-sm transition-colors",
                    selected
                      ? "bg-ocean-500/10 text-ocean-400 dark:text-surf-600"
                      : "opacity-80 hover:bg-ocean-500/10 hover:opacity-100",
                  )}
                >
                  {option.label}
                  {selected && (
                    <Check
                      size={14}
                      aria-hidden
                      className="shrink-0 text-surf-500"
                    />
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
