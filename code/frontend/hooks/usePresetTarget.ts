"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";

/**
 * Target preset via ?target= (Tools-menu deep links). Invalid values fall
 * back to the studio default; later menu clicks re-sync while mounted.
 * Render-phase sync (not an effect): adjusting state during render from the
 * URL is the compliant pattern and never cascades.
 */
export function usePresetTarget(valid: readonly string[], fallback: string) {
  const searchParams = useSearchParams();
  const [target, setTarget] = useState(fallback);
  const [prevPreset, setPrevPreset] = useState<string | null>(null);

  const preset = searchParams.get("target");
  if (preset !== prevPreset) {
    setPrevPreset(preset);
    if (preset && valid.includes(preset)) setTarget(preset);
  }

  return [target, setTarget] as const;
}
