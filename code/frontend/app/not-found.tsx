"use client";

import { Home } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ROUTES } from "@/lib/routes";

export default function NotFound() {
  return (
    <div className="grid min-h-[60vh] place-items-center p-8 text-center">
      <div className="max-w-md space-y-4">
        <h2 className="text-xl font-semibold">Well, this is awkward.</h2>
        <p className="text-sm opacity-70">
          We couldn&apos;t find that page — but your data is safe.
        </p>
        <div className="flex justify-center">
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
