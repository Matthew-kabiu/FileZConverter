export function LoadingState({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="grid min-h-[40vh] place-items-center p-8 text-center">
      <p className="text-sm opacity-70">{label}</p>
    </div>
  );
}

export function EmptyState({
  title,
  hint,
}: {
  title: string;
  hint?: string;
}) {
  return (
    <div className="grid min-h-[40vh] place-items-center p-8 text-center">
      <div className="max-w-md space-y-2">
        <p className="text-sm font-medium">{title}</p>
        {hint && <p className="text-xs opacity-60">{hint}</p>}
      </div>
    </div>
  );
}
