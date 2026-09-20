const ERROR_MESSAGES: Record<string, string> = {
  VALIDATION_ERROR: "Please check the highlighted fields and try again.",
  UNAUTHORIZED: "Your session has expired. Please sign in again.",
  FORBIDDEN: "You don't have permission to do that.",
  NOT_FOUND: "We couldn't find what you were looking for.",
  CONFLICT: "That already exists. Try a different value.",
  RATE_LIMIT_EXCEEDED: "You're doing that too fast. Please wait a moment.",
  SETUP_REQUIRED: "AI isn't set up yet. Open AI Setup to configure it.",
  MISSING_KEY: "No API key saved for that provider. Open AI Setup to add one.",
  UNKNOWN_MODEL: "That model isn't supported. Pick another in AI Setup.",
  PROVIDER_RATE_LIMITED:
    "The AI provider is rate-limiting this model. Wait a moment or select another model.",
  PROVIDER_UNAVAILABLE:
    "This AI model is temporarily overloaded. Try again shortly or select another model.",
  PROVIDER_ERROR:
    "The AI provider couldn't complete that request. Check the selected model and try again.",
  NETWORK_ERROR: "Connection problem. Check your internet and try again.",
  UNKNOWN_ERROR: "Something went wrong on our side. Please try again.",
};

export function mapErrorToMessage(code: string, status: number): string {
  return (
    ERROR_MESSAGES[code] ??
    (status >= 500 ? ERROR_MESSAGES.UNKNOWN_ERROR : ERROR_MESSAGES.NETWORK_ERROR)
  );
}
