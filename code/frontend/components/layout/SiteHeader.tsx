"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef, useState } from "react";
import { ChevronDown, Files, Wrench } from "lucide-react";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { useDismiss } from "@/hooks/useDismiss";
import { MORE_TOOLS, STUDIO_TOOLS, toolHref } from "@/lib/tools/tools";
import { cn } from "@/lib/utils/cn";

function NavLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group relative cursor-pointer rounded-lg px-3 py-1.5 font-display text-sm font-medium transition-colors",
        active
          ? "text-ocean-400 dark:text-surf-600"
          : "opacity-70 hover:text-twilight-300 hover:opacity-100 dark:hover:text-frost-800",
      )}
    >
      {children}
      <span
        className="absolute inset-0 rounded-lg transition-colors group-hover:bg-ocean-500/5"
        aria-hidden
      />
      <span
        aria-hidden
        className={cn(
          "absolute inset-x-3 -bottom-0.5 h-0.5 origin-left rounded-full",
          "bg-gradient-to-r from-ocean-500 to-surf-500",
          "transition-transform duration-200 ease-out",
          active ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100",
        )}
      />
    </Link>
  );
}

/** Site shell header: brand, studio nav, tools menu, theme toggle. */
export function SiteHeader() {
  const pathname = usePathname();
  const [toolsOpen, setToolsOpen] = useState(false);
  const toolsRef = useRef<HTMLDivElement | null>(null);
  useDismiss(toolsRef, () => setToolsOpen(false), toolsOpen);

  return (
    <header className="relative z-40 flex h-16 shrink-0 items-center justify-between border-b border-ocean-500/15 bg-white/70 px-4 backdrop-blur sm:px-6 dark:border-white/10 dark:bg-twilight-300/70">
      <Link href="/" className="flex shrink-0 items-center gap-2.5">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-ocean-500 to-surf-500 text-white shadow-lg shadow-ocean-500/25">
          <Files size={18} aria-hidden />
        </span>
        <span className="font-display text-lg font-semibold tracking-tight">
          FilezConverter
        </span>
      </Link>
      <nav
        aria-label="Studios"
        className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-1 md:flex"
      >          {STUDIO_TOOLS.map((tool) => (
            <NavLink
              key={tool.slug}
              href={tool.href}
              active={pathname === tool.href}
            >
              {tool.navLabel}
            </NavLink>
          ))}
          <div className="relative" ref={toolsRef}>
            <button
              type="button"
              onClick={() => setToolsOpen((v) => !v)}
              aria-expanded={toolsOpen}
              aria-haspopup="menu"
              aria-label="More tools"
              className="group relative cursor-pointer rounded-lg px-3 py-1.5 font-display text-sm font-medium opacity-70 transition-colors hover:text-twilight-300 hover:opacity-100 dark:hover:text-frost-800"
            >
              <span className="flex items-center gap-1">
                <Wrench size={14} aria-hidden />
                Tools
                <ChevronDown
                  size={14}
                  aria-hidden
                  className={cn("transition-transform", toolsOpen && "rotate-180")}
                />
              </span>
              <span
                aria-hidden
                className="absolute inset-x-3 -bottom-0.5 h-0.5 origin-left scale-x-0 rounded-full bg-gradient-to-r from-ocean-500 to-surf-500 transition-transform duration-200 ease-out group-hover:scale-x-100"
              />
            </button>
            {toolsOpen && (
              <div className="absolute left-0 top-full z-50 mt-1 w-56 rounded-xl border border-ocean-500/15 bg-white p-1.5 font-display shadow-xl dark:border-white/10 dark:bg-twilight-300" role="menu">
                {MORE_TOOLS.map((tool) => (
                  <Link
                    key={tool.label}
                    href={toolHref(tool)}
                    role="menuitem"
                    onClick={() => setToolsOpen(false)}
                    className="block cursor-pointer rounded-lg px-3 py-1.5 text-sm opacity-80 transition-colors hover:bg-ocean-500/10 hover:opacity-100"
                  >
                    {tool.label}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </nav>
      <ThemeToggle />
    </header>
  );
}
