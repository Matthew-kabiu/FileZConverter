import { toast } from "sonner";
import { ApiClientError } from "@/lib/api/apiClient";

export const notify = {
  success: (msg: string) => toast.success(msg),
  info: (msg: string) => toast.info(msg),
  warning: (msg: string) => toast.warning(msg),
  /**
   * Errors: accepts unknown, but ONLY ever displays the mapped
   * userMessage. Raw backend errors never reach the toast.
   */
  error: (
    err: unknown,
    fallback = "Something went wrong. Please try again.",
  ) => {
    const msg = err instanceof ApiClientError ? err.userMessage : fallback;
    toast.error(msg);
  },
  promise: toast.promise,
};
