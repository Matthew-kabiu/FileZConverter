export type SupportType = "bug" | "improvement" | "feature";

export const SUPPORT_TYPES: { value: SupportType; label: string }[] = [
  { value: "bug", label: "Bug" },
  { value: "improvement", label: "Improvement" },
  { value: "feature", label: "Feature" },
];

export interface SupportPayload {
  type: SupportType;
  description: string;
  email: string | null;
  page: string;
  app: string;
  timestamp: string;
}

/** Missing/invalid description reason, or null when submittable. */
export function validateSupportInput(description: string): string | null {
  if (description.trim().length < 10)
    return "Please describe the issue in at least 10 characters.";
  if (description.trim().length > 5000)
    return "Please keep the description under 5000 characters.";
  return null;
}

export function validateSupportEmail(email: string): string | null {
  const trimmed = email.trim();
  if (!trimmed) return null;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed))
    return "That email doesn't look valid — fix it or leave it empty.";
  return null;
}

/** Pure payload builder — unit-tested, no DOM access. */
export function buildSupportPayload(input: {
  type: SupportType;
  description: string;
  email: string;
  page: string;
  now?: Date;
}): SupportPayload {
  return {
    type: input.type,
    description: input.description.trim(),
    email: input.email.trim() ? input.email.trim() : null,
    page: input.page,
    app: "FilezConverter",
    timestamp: (input.now ?? new Date()).toISOString(),
  };
}
