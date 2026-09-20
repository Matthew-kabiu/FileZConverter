"use client";

import { Files } from "lucide-react";
import { env } from "@/lib/config/env";

export const OPEN_SUPPORT_EVENT = "filez:open-support";
export const TRIFFIX_URL = "https://triffixsolutions.co.ke";

export function openSupportForm() {
  window.dispatchEvent(new Event(OPEN_SUPPORT_EVENT));
}

/** Footer link with the signature gradient underline hover (matches header nav). */
function FooterLink({
  onClick,
  children,
}: {
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative cursor-pointer pb-0.5 transition-opacity hover:opacity-100 hover:text-twilight-300 dark:hover:text-frost-800"
    >
      {children}
      <span
        aria-hidden
        className="absolute inset-x-0 -bottom-0.5 h-0.5 origin-left scale-x-0 rounded-full bg-gradient-to-r from-ocean-500 to-surf-500 transition-transform duration-200 ease-out group-hover:scale-x-100"
      />
    </button>
  );
}

function FooterAnchor({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="group relative pb-0.5 transition-opacity hover:opacity-100 hover:text-twilight-300 dark:hover:text-frost-800"
    >
      {children}
      <span
        aria-hidden
        className="absolute inset-x-0 -bottom-0.5 h-0.5 origin-left scale-x-0 rounded-full bg-gradient-to-r from-ocean-500 to-surf-500 transition-transform duration-200 ease-out group-hover:scale-x-100"
      />
    </a>
  );
}

/** Global footer: brand + LEGAL / COMPANY columns. */
export function SiteFooter({
  onPrivacy,
  onTerms,
}: {
  onPrivacy: () => void;
  onTerms: () => void;
}) {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-ocean-500/15 dark:border-white/10">
      <div className="mx-auto grid w-[80vw] max-w-[90rem] gap-10 px-4 py-12 md:grid-cols-[1.6fr_1fr_1fr]">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-ocean-500 to-surf-500 text-white shadow-lg shadow-ocean-500/25">
              <Files size={18} aria-hidden />
            </span>
            <span className="font-display text-lg font-semibold tracking-tight">
              FilezConverter
            </span>
          </div>
          <p className="mt-4 max-w-sm text-sm leading-6 opacity-60">
            Privacy-first file viewer, editor, and converter. Files stay on
            your device unless a conversion explicitly needs the server —
            nothing is ever retained.
          </p>
        </div>

        <nav aria-label="Legal">
          <h3 className="font-display text-sm font-semibold tracking-wide">
            LEGAL
          </h3>
          <ul className="mt-4 space-y-2.5 text-sm opacity-70">
            <li>
              <FooterLink onClick={onPrivacy}>Privacy Policy</FooterLink>
            </li>
            <li>
              <FooterLink onClick={onTerms}>Terms of Service</FooterLink>
            </li>
          </ul>
        </nav>

        <nav aria-label="Company">
          <h3 className="font-display text-sm font-semibold tracking-wide">
            COMPANY
          </h3>
          <ul className="mt-4 space-y-2.5 text-sm opacity-70">
            <li>
              <FooterLink onClick={openSupportForm}>Support</FooterLink>
            </li>
            {env.NEXT_PUBLIC_REPO_URL && (
              <li>
                <FooterAnchor href={env.NEXT_PUBLIC_REPO_URL}>
                  GitHub
                </FooterAnchor>
              </li>
            )}
          </ul>
        </nav>
      </div>

      <div className="border-t border-ocean-500/10 dark:border-white/10">
        <div className="mx-auto flex w-[80vw] max-w-[90rem] flex-col items-center justify-between gap-2 px-4 py-5 text-center text-sm opacity-60 sm:flex-row sm:text-left">
          <p>© {year} • FilezConverter All rights reserved.</p>
          <p>
            Built by{" "}
            <a
              href={TRIFFIX_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="group relative font-display font-semibold opacity-100"
            >
              <span className="bg-gradient-to-r from-ocean-400 to-surf-500 bg-clip-text text-transparent dark:from-surf-600 dark:to-surf-500">
                TriffixSolutions
              </span>
              <span
                aria-hidden
                className="absolute inset-x-0 -bottom-0.5 h-0.5 origin-left scale-x-0 rounded-full bg-gradient-to-r from-ocean-500 to-surf-500 transition-transform duration-200 ease-out group-hover:scale-x-100"
              />
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
