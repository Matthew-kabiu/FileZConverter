"use client";

import { useState } from "react";
import {
  BotMessageSquare,
  ChevronDown,
  FileStack,
  LayoutTemplate,
  MousePointerClick,
  ShieldCheck,
  Sparkles,
  Type,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";

const FAQS = [
  {
    q: "Do my files leave my device?",
    a: "Only when a conversion explicitly needs the server, for example LibreOffice or PDF rendering lanes. Every server conversion runs in a per-session tmp directory that is deleted after the response, plus a manual purge and a 30-minute sweeper. Nothing is ever retained.",
  },
  {
    q: "Do I need to sign in?",
    a: "No. All four studios work without an account. Sign-in unlocks the Snow document assistant (RAG chat), AI setup, and admin tools on self-hosted instances.",
  },
  {
    q: "What does the Snow chatbot cost?",
    a: "Each self-hosted tenant brings their own provider keys (BYOK): chat and embedding spend belongs to the key owner, never to the operator. Local embeddings are free and never leave your infrastructure.",
  },
  {
    q: "Which formats are supported?",
    a: "Markdown, Word (.docx plus legacy .doc, .odt, .rtf), spreadsheets (.xlsx, .xls, .csv, .ods), PDF (merge, split, text extract), TXT, and HTML, across the Markdown, Word, Spreadsheet, and PDF studios.",
  },
  {
    q: "Is there a file size limit?",
    a: "Uploads are capped at 25MB per file and Markdown inputs at 1M characters, so conversions stay fast and abuse stays out. Larger jobs should be split before upload.",
  },
  {
    q: "How do I report a bug or request a feature?",
    a: "Use the floating button at the bottom-right and pick Support. Bug reports, improvements, and feature requests go straight to the team, no account needed.",
  },
];

function Card({
  icon,
  title,
  children,
  className,
  featured,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
  className?: string;
  featured?: boolean;
}) {
  return (
    <article
      className={cn(
        "group rounded-2xl border p-5 transition-colors sm:p-6",
        featured
          ? "border-ocean-500/30 bg-gradient-to-br from-ocean-500/[0.08] to-surf-500/[0.05] dark:border-surf-500/30 dark:from-surf-500/10 dark:to-transparent"
          : "border-ocean-500/15 bg-white/70 hover:border-ocean-500/30 dark:border-white/10 dark:bg-white/[0.03] dark:hover:border-white/20",
        className,
      )}
    >
      <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-ocean-500 to-surf-500 text-white shadow-lg shadow-ocean-500/25 transition-transform duration-200 group-hover:scale-105">
        {icon}
      </span>
      <h3 className="mt-4 font-display text-lg font-semibold tracking-tight">
        {title}
      </h3>
      <div className="mt-2 text-sm leading-6 opacity-70">{children}</div>
    </article>
  );
}

/**
 * Global below-the-fold section on every studio: bento grid (privacy card
 * is the hero) + FAQ accordion, full 80vw width.
 */
export function SiteCtaFaq() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section
      aria-label="About FilezConverter"
      className="border-t border-ocean-500/15 dark:border-white/10"
    >
      <div className="mx-auto w-[80vw] max-w-[90rem] px-4 py-12 sm:py-16">
        <p className="font-display text-xs font-semibold tracking-[0.2em] opacity-60">
          WHY FILEZCONVERTER
        </p>
        <h2 className="mt-2 max-w-3xl font-display text-2xl font-bold tracking-tight sm:text-3xl">
          Native editing per format,{" "}
          <span className="bg-gradient-to-r from-ocean-400 to-surf-500 bg-clip-text text-transparent dark:from-surf-600 dark:to-surf-500">
            polished exports in seconds
          </span>
        </h2>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <article className="relative overflow-hidden rounded-2xl border border-violet-400/30 bg-gradient-to-br from-violet-500/[0.12] via-transparent to-fuchsia-500/[0.10] p-5 sm:p-8 md:col-span-3 dark:border-fuchsia-400/25 dark:from-violet-500/[0.18] dark:via-transparent dark:to-fuchsia-500/[0.10]">
            <div className="flex flex-wrap items-center gap-3">
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white shadow-lg shadow-fuchsia-500/25">
                <BotMessageSquare size={22} aria-hidden />
              </span>
              <span className="rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 px-3 py-1 font-display text-[11px] font-semibold tracking-[0.14em] text-white uppercase">
                Snow • Private RAG
              </span>
            </div>
            <h3 className="mt-4 font-display text-xl font-bold tracking-tight sm:text-2xl">
              Meet Snow:{" "}
              <span className="bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
                private RAG, open embeddings
              </span>
            </h3>
            <p className="mt-3 max-w-4xl text-[15px] leading-7 opacity-80">
              Snow answers only from your own documents and cites the file and
              section behind every answer. Embeddings run on the open-source
              all-MiniLM-L6-V2 model, locally on the server, so indexing is
              free and your text is never shipped to a third party for search.
              Chat itself plugs into OpenAI, Anthropic, Gemini, or OpenRouter
              wrappers, with your own keys encrypted at rest. Bring a key for
              frontier models or keep it local. Either way there is no
              lock-in.
            </p>
          </article>

          <Card
            icon={<FileStack size={18} aria-hidden />}
            title="Why convert files here?"
            className="md:col-span-2"
          >
            <p>
              Drafting in Markdown, editing in Word, modelling in
              spreadsheets, and delivering in PDF all pull in different
              directions, yet the final delivery still has to look
              intentional. PDF ensures consistent typography, page breaks, and
              professional presentation across devices and print. Our{" "}
              <strong className="font-semibold text-inherit">
                four studios keep the editing experience native
              </strong>{" "}
              to each format while giving you a polished export in seconds.
            </p>
          </Card>

          <Card
            icon={<MousePointerClick size={18} aria-hidden />}
            title="How to use the studios"
          >
            <ol className="list-decimal space-y-1.5 pl-5">
              <li>
                <strong className="font-semibold text-inherit">
                  Paste or upload
                </strong>
                : drop a file in, or paste content.
              </li>
              <li>
                <strong className="font-semibold text-inherit">
                  Review live
                </strong>
                : edit cells, merge/split, verify spacing.
              </li>
              <li>
                <strong className="font-semibold text-inherit">
                  Download
                </strong>
                : pick a target, share or print.
              </li>
            </ol>
          </Card>

          <Card
            icon={<LayoutTemplate size={18} aria-hidden />}
            title="Layout-aware rendering"
          >
            <p>
              Each studio rebuilds your document in a standards-compliant
              environment, then renders a vector-based export. Headings, lists,
              tables, code blocks, and blockquotes keep proper spacing and
              hierarchy.
            </p>
          </Card>

          <Card
            icon={<ShieldCheck size={18} aria-hidden />}
            title="How your content is handled"
            featured
            className="md:col-span-2"
          >
            <p>
              <span className="mb-2 inline-block rounded-full bg-gradient-to-r from-ocean-500 to-surf-500 px-2.5 py-0.5 font-display text-[11px] font-semibold tracking-wide text-white uppercase">
                Privacy-first
              </span>
            </p>
            <p>
              To run a conversion, your file is processed in an{" "}
              <strong className="font-semibold text-inherit">
                isolated session only for the duration of the job
              </strong>
              . It is not persistently stored, never used for any other
              purpose, and the session directory is purged after every
              response, with a manual purge control and a 30-minute sweeper
              as backstop.
            </p>
          </Card>

          <Card
            icon={<Type size={18} aria-hidden />}
            title="Typography that matches"
          >
            <p>
              Headings scale gracefully, inline code keeps its monospace
              style, tables stay readable. The result looks intentional
              instead of improvised.
            </p>
          </Card>

          <Card
            icon={<Sparkles size={18} aria-hidden />}
            title="Power features"
            className="md:col-span-2"
          >
            <p>
              Real OOXML tables in Markdown-to-Word exports, PDF merge and
              split, spreadsheet cell editing, sanitized live previews, and
              session snapshots that survive a refresh.
            </p>
          </Card>
        </div>

        <h2 className="mt-12 font-display text-2xl font-bold tracking-tight sm:text-3xl">
          Frequently asked questions
        </h2>
        <div className="mt-4 space-y-2.5">
          {FAQS.map((faq, i) => {
            const open = openIndex === i;
            return (
              <div
                key={faq.q}
                className={cn(
                  "overflow-hidden rounded-2xl border transition-colors",
                  open
                    ? "border-ocean-500/30 bg-ocean-500/[0.04] dark:border-surf-500/30 dark:bg-white/[0.04]"
                    : "border-ocean-500/15 dark:border-white/10",
                )}
              >
                <button
                  type="button"
                  onClick={() => setOpenIndex(open ? null : i)}
                  aria-expanded={open}
                  aria-controls={`faq-panel-${i}`}
                  id={`faq-button-${i}`}
                  className="group flex w-full cursor-pointer items-center justify-between gap-3 px-4 py-3.5 text-left"
                >
                  <span className="relative font-display text-[15px] font-semibold">
                    {faq.q}
                    <span
                      aria-hidden
                      className={cn(
                        "absolute inset-x-0 -bottom-0.5 h-0.5 origin-left rounded-full",
                        "bg-gradient-to-r from-ocean-500 to-surf-500",
                        "transition-transform duration-200 ease-out",
                        open
                          ? "scale-x-100"
                          : "scale-x-0 group-hover:scale-x-100",
                      )}
                    />
                  </span>
                  <span
                    className={cn(
                      "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-colors",
                      open
                        ? "bg-gradient-to-br from-ocean-500 to-surf-500 text-white"
                        : "bg-ocean-500/10 opacity-70 group-hover:opacity-100 dark:bg-white/10",
                    )}
                  >
                    <ChevronDown
                      size={15}
                      aria-hidden
                      className={cn(
                        "transition-transform duration-200",
                        open && "rotate-180",
                      )}
                    />
                  </span>
                </button>
                <div
                  id={`faq-panel-${i}`}
                  role="region"
                  aria-labelledby={`faq-button-${i}`}
                  className={cn(
                    "grid transition-[grid-template-rows] duration-200 ease-out",
                    open ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
                  )}
                >
                  <div className="overflow-hidden">
                    <p className="px-4 pb-4 text-sm leading-6 opacity-70">
                      {faq.a}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
