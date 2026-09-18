/** Standard envelope shared by Route Handlers (mirrors backend §4.3 shape). */
export interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  error?: string;
  message?: string;
}
