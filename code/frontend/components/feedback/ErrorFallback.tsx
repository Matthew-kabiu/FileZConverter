"use client";

import { RotateCcw, Home } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ROUTES } from "@/lib/routes";

export function ErrorFallback({ retry }: { retry?: () => void }) {
  return (
    <div className="grid min-h-[60vh] place-items-center p-8 text-center">
      <div className="max-w-md space-y-4">
        <h2 className="text-xl font-semibold">Well, this is awkward.</h2>
        <p className="text-sm opacity-70">
          Something broke on our side — not yours. Your data is safe. Try
          again, or head back home.
        </p>
        <div className="flex justify-center gap-3">
          {retry && (
            <Button icon={RotateCcw} onClick={retry}>
              Try again
            </Button>
          )}
          <Button
            icon={Home}
            variant="secondary"
            onClick={() => (window.location.href = ROUTES.pages.home)}
          >
            Go home
          </Button>
        </div>
      </div>
    </div>
  );
}
