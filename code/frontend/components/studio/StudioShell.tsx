import type { ReactNode } from "react";
import { FadeIn } from "@/components/motion/FadeIn";

export function StudioShell({
  title,
  subtitle,
  toolbar,
  panel,
  left,
  right,
}: {
  title: string;
  subtitle: string;
  toolbar?: ReactNode;
  panel?: ReactNode;
  left: ReactNode;
  right: ReactNode;
}) {
  const content = (
    <>
      <FadeIn className="min-w-0">
        <section aria-label="Input and editing" className="min-w-0 space-y-4">
          {left}
        </section>
      </FadeIn>
      <FadeIn delay={0.08} className="min-w-0">
        <section aria-label="Preview and download" className="min-w-0 space-y-4">
          {right}
        </section>
      </FadeIn>
    </>
  );

  return (
    <main className="mx-auto w-[94%] px-[4%] py-8 sm:w-[85vw] sm:px-6">
      <div className="animate-rise mx-auto max-w-3xl text-center">
        <h1 className="font-display text-4xl font-bold tracking-tight sm:text-5xl">{title}</h1>
        <p className="mx-auto mt-3 max-w-2xl text-sm opacity-70 sm:text-lg">
          {subtitle}
        </p>
        {toolbar && <div className="mt-4 flex justify-center">{toolbar}</div>}
      </div>
      {panel ? (
        <div className="mt-8 flex min-w-0 flex-col gap-4 xl:flex-row">
          {panel}
          <div className="grid min-w-0 flex-1 gap-4 lg:grid-cols-2">
            {content}
          </div>
        </div>
      ) : (
        <div className="mt-8 grid min-w-0 gap-4 lg:grid-cols-2">{content}</div>
      )}
    </main>
  );
}

export function StudioCard({
  title,
  icon,
  action,
  children,
}: {
  title: string;
  icon: ReactNode;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="min-w-0 max-w-full rounded-2xl border border-ocean-500/15 bg-white/80 p-4 shadow-sm sm:p-5 dark:border-white/10 dark:bg-twilight-300/70">
      <div className="mb-3 flex min-w-0 items-center justify-between gap-2">
        <h2 className="flex min-w-0 flex-1 items-center gap-2 font-display text-lg font-semibold">
          <span className="shrink-0 opacity-70">{icon}</span>
          <span className="truncate">{title}</span>
        </h2>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      {children}
    </div>
  );
}
