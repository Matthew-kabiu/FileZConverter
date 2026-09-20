import { redirect } from "next/navigation";
import { getSignInRoute } from "@/lib/routes";

/** Legacy route: authentication is rendered only by the global modal. */
export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[] }>;
}) {
  const params = await searchParams;
  const next = typeof params.next === "string" ? params.next : undefined;
  redirect(getSignInRoute(next));
}
