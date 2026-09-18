import { z } from "zod";

const serverSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]),
  PORT: z.string().min(1).transform(Number),
});

const clientSchema = z.object({
  NEXT_PUBLIC_API_BASE_URL: z.string().url(),
  NEXT_PUBLIC_APP_NAME: z.string().min(1),
});

// Client vars must be referenced literally for Next.js inlining.
const clientRuntime = {
  NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL,
  NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME,
};

// NOTE: this module ships to the browser (routes.ts → error boundaries), so
// server-only vars are validated ONLY on the server, and failures throw
// (never process.exit — it does not exist in the browser and crashed the
// error boundary chain in dev).
const serverParsed =
  typeof window === "undefined"
    ? serverSchema.safeParse(process.env)
    : { success: true as const, data: {} };

if (!serverParsed.success) {
  throw new Error(
    `Invalid server environment variables: ${JSON.stringify(serverParsed.error.format())}`,
  );
}

const clientParsed = clientSchema.safeParse(clientRuntime);
if (!clientParsed.success) {
  throw new Error(
    `Invalid public environment variables: ${JSON.stringify(clientParsed.error.format())}`,
  );
}

export const env = { ...serverParsed.data, ...clientParsed.data };
