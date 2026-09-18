"use client";

import { useEffect } from "react";
import { ErrorFallback } from "@/components/feedback/ErrorFallback";

export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    // Raw error → console in dev only. NEVER the UI.
    if (process.env.NODE_ENV !== "production") console.error(error);
  }, [error]);
  return (
    <html lang="en">
      <body>
        <ErrorFallback retry={retry} />
      </body>
    </html>
  );
}
