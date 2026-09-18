"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

type Theme = "light" | "dark";

const ThemeContext = createContext<{
  theme: Theme;
  toggle: () => void;
}>({ theme: "light", toggle: () => undefined });

const STORAGE_KEY = "filezconverter-theme";

function initialTheme(): Theme {
  if (typeof window === "undefined") return "light";
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === "light" || stored === "dark") return stored;
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

/** Owns the `dark` class on <html> + persistence. No dependency needed. */
export function ThemeProvider({ children }: { children: ReactNode }) {
  // Fixed "light" first render matches SSR exactly (no hydration mismatch);
  // the mount-once effect below then syncs storage/system preference.
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    const next = initialTheme();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- mount-once theme sync from storage/system preference; runs once, no loop
    setTheme(next);
  }, []);

  // DOM-only sync (no storage writes here: in dev StrictMode, mount effects
  // run twice, and a stale "light" write here used to clobber the stored
  // preference — every refresh landed on light).
  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    document.documentElement.style.colorScheme = theme;
  }, [theme]);

  const toggle = useCallback(() => {
    setTheme((prev) => {
      const next: Theme = prev === "dark" ? "light" : "dark";
      // Storage is written ONLY on user toggle, never by effects, so mount
      // can never clobber it. Re-invocation in StrictMode dev repeats the
      // identical write (same prev → same next) — idempotent.
      document.documentElement.classList.toggle("dark", next === "dark");
      document.documentElement.style.colorScheme = next;
      window.localStorage.setItem(STORAGE_KEY, next);
      return next;
    });
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
