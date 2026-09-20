"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { useDismiss } from "@/hooks/useDismiss";
import { cn } from "@/lib/utils/cn";

export interface SelectOption {
  value: string;
  label: string;
  detail?: string;
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
  className,
}: {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  ariaLabel: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [openUp, setOpenUp] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const boxRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const listboxId = useId();
  const close = () => setOpen(false);
  useDismiss(boxRef, close, open);

  const current = options.find((o) => o.value === value);
  const selectedIndex = Math.max(
    0,
    options.findIndex((option) => option.value === value),
  );

  useEffect(() => {
    if (open) optionRefs.current[activeIndex]?.focus();
  }, [activeIndex, open]);

  const show = (index = selectedIndex) => {
    const trigger = triggerRef.current;
    if (trigger) {
      const menuHeight = Math.min(options.length * 48 + 12, 240);
      const rect = trigger.getBoundingClientRect();
      setOpenUp(window.innerHeight - rect.bottom < menuHeight && rect.top > menuHeight);
    }
    setActiveIndex(index);
    setOpen(true);
  };

  const move = (next: number) => {
    setActiveIndex((next + options.length) % options.length);
  };

  const select = (option: SelectOption) => {
    onChange(option.value);
    close();
    requestAnimationFrame(() => triggerRef.current?.focus());
  };

  return (
    <div ref={boxRef} className={cn("relative min-w-0", className)}>
      <button
        ref={triggerRef}
        id={id}
        type="button"
        onClick={() => (open ? close() : show())}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            show(event.key === "ArrowDown" ? selectedIndex : options.length - 1);
          }
        }}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={open ? listboxId : undefined}
        aria-label={ariaLabel}
        className={cn(
          "flex h-11 w-full cursor-pointer items-center justify-between gap-3 rounded-xl border px-3.5 text-left",
          "border-ocean-500/20 bg-white/70 font-display text-sm font-semibold shadow-sm",
          "outline-none transition duration-200 hover:border-surf-500/60 hover:bg-ocean-500/[0.04] focus-visible:border-surf-500/70 focus-visible:ring-2 focus-visible:ring-surf-500/20",
          "dark:border-white/10 dark:bg-twilight-300/70 dark:hover:bg-white/[0.04]",
          open && "border-surf-500/60 ring-2 ring-surf-500/15",
        )}
      >
        <span className="min-w-0 truncate">{current?.label ?? value}</span>
        <ChevronDown
          size={16}
          aria-hidden
          className={cn("shrink-0 opacity-60 transition-transform", open && "rotate-180")}
        />
      </button>
      {open && (
        <ul
          id={listboxId}
          role="listbox"
          aria-label={ariaLabel}
          className={cn(
            "absolute right-0 z-50 max-h-60 min-w-full overflow-y-auto rounded-xl border border-ocean-500/15 bg-white p-1.5 font-display shadow-2xl shadow-ocean-950/15",
            "dark:border-white/10 dark:bg-twilight-300 dark:shadow-black/35",
            openUp ? "bottom-full mb-1.5" : "top-full mt-1.5",
          )}
        >
          {options.map((option, index) => {
            const selected = option.value === value;
            return (
              <li key={option.value} role="option" aria-selected={selected}>
                <button
                  ref={(element) => {
                    optionRefs.current[index] = element;
                  }}
                  type="button"
                  onClick={() => select(option)}
                  onFocus={() => setActiveIndex(index)}
                  onKeyDown={(event) => {
                    if (event.key === "ArrowDown") {
                      event.preventDefault();
                      move(activeIndex + 1);
                    } else if (event.key === "ArrowUp") {
                      event.preventDefault();
                      move(activeIndex - 1);
                    } else if (event.key === "Home") {
                      event.preventDefault();
                      move(0);
                    } else if (event.key === "End") {
                      event.preventDefault();
                      move(options.length - 1);
                    } else if (event.key === "Escape") {
                      event.preventDefault();
                      event.stopPropagation();
                      close();
                      triggerRef.current?.focus();
                    }
                  }}
                  className={cn(
                    "flex min-h-10 w-full cursor-pointer items-center justify-between gap-4 rounded-lg px-3 py-2 text-left text-sm outline-none transition-colors",
                    selected
                      ? "bg-gradient-to-r from-ocean-500/15 to-surf-500/10 text-ocean-500 dark:text-surf-600"
                      : "opacity-75 hover:bg-ocean-500/10 hover:opacity-100 focus-visible:bg-ocean-500/10 focus-visible:opacity-100",
                  )}
                >
                  <span className="min-w-0">
                    <span className="block whitespace-nowrap font-semibold">{option.label}</span>
                    {option.detail && (
                      <span className="mt-0.5 block whitespace-nowrap text-[11px] font-normal opacity-60">
                        {option.detail}
                      </span>
                    )}
                  </span>
                  {selected && (
                    <Check
                      size={15}
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
