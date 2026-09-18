const ERROR_MESSAGES: Record<string, string> = {
  VALIDATION_ERROR: "Please check the highlighted fields and try again.",
  UNAUTHORIZED: "Your session has expired. Please sign in again.",
  FORBIDDEN: "You don't have permission to do that.",
  NOT_FOUND: "We couldn't find what you were looking for.",
  CONFLICT: "That already exists. Try a different value.",
  RATE_LIMIT_EXCEEDED: "You're doing that too fast. Please wait a moment.",
  NETWORK_ERROR: "Connection problem. Check your internet and try again.",
  UNKNOWN_ERROR: "Something went wrong on our side. Please try again.",
};

export function mapErrorToMessage(code: string, status: number): string {
  return (
    ERROR_MESSAGES[code] ??
    (status >= 500 ? ERROR_MESSAGES.UNKNOWN_ERROR : ERROR_MESSAGES.NETWORK_ERROR)
  );
}
