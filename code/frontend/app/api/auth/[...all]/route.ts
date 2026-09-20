import { auth, ensureAuthSchema } from "@/lib/auth/auth";

/** Better Auth handler (sign-in/out, session). Signup stays disabled server-side. */
async function handle(request: Request): Promise<Response> {
  await ensureAuthSchema();
  return auth.handler(request);
}

export async function GET(request: Request): Promise<Response> {
  return handle(request);
}

export async function POST(request: Request): Promise<Response> {
  return handle(request);
}
