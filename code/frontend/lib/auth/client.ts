import { createAuthClient } from "better-auth/react";
import { adminClient } from "better-auth/client/plugins";

/** Browser-side Better Auth client (sign-in/out, later admin UI). */
export const authClient = createAuthClient({
  plugins: [adminClient()],
});
