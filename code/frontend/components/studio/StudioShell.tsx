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
      <FadeIn>
        <section aria-label="Input and editing" className="space-y-4">
          {left}
        </section>
      </FadeIn>
      <FadeIn delay={0.08}>
        <section aria-label="Preview and download" className="space-y-4">
          {right}
        </section>
      </FadeIn>
    </>
  );

  return (
    <main className="mx-auto w-[85vw] px-4 py-8 sm:px-6">
      <div className="animate-rise mx-auto max-w-3xl text-center">
        <h1 className="font-display text-4xl font-bold tracking-tight sm:text-5xl">{title}</h1>
        <p className="mx-auto mt-3 max-w-2xl text-sm opacity-70 sm:text-lg">
          {subtitle}
        </p>
        {toolbar && <div className="mt-4 flex justify-center">{toolbar}</div>}
      </div>
      {panel ? (
        <div className="mt-8 flex flex-col gap-4 xl:flex-row">
          {panel}
          <div className="grid min-w-0 flex-1 gap-4 lg:grid-cols-2">
            {content}
          </div>
        </div>
      ) : (
        <div className="mt-8 grid gap-4 lg:grid-cols-2">{content}</div>
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
    <div className="rounded-2xl border border-ocean-500/15 bg-white/80 p-4 shadow-sm sm:p-5 dark:border-white/10 dark:bg-twilight-300/70">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
          <span className="opacity-70">{icon}</span>
          {title}
        </h2>
        {action}
      </div>
      {children}
    </div>
  );
}
