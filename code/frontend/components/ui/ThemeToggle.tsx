"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/components/ui/ThemeProvider";

export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const Icon = theme === "dark" ? Sun : Moon;
  return (
    <button
      type="button"
      onClick={toggle}
      suppressHydrationWarning
      aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
      data-tooltip-id="app-tooltip"
      data-tooltip-content={theme === "dark" ? "Light theme" : "Dark theme"}
      className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-frost-500/40 bg-white/60 text-twilight-300 transition-colors hover:bg-frost-800 dark:border-white/10 dark:bg-twilight-400/60 dark:text-frost-800 dark:hover:bg-white/10"
    >
      <Icon size={16} aria-hidden />
    </button>
  );
}
