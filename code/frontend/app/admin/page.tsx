import { redirect } from "next/navigation";
import { AdminPanel } from "@/app/admin/AdminPanel";
import { PanelModalShell } from "@/components/ui/PanelModalShell";
import { getSession } from "@/lib/auth/session";
import { getSignInRoute, ROUTES } from "@/lib/routes";

/** Unified AI settings and admin-only user management panel. */
export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string | string[] }>;
}) {
  const params = await searchParams;
  const requestedTab = typeof params.tab === "string" ? params.tab : "ai";
  const session = await getSession();
  if (!session) {
    redirect(
      getSignInRoute(
        requestedTab === "users" ? ROUTES.pages.adminUsers : ROUTES.pages.adminAi,
      ),
    );
  }
  const isAdmin = session.user.role === "admin";
  const initialTab = requestedTab === "users" && isAdmin ? "users" : "ai";

  return (
    <PanelModalShell
      title={isAdmin ? "Admin panel" : "AI setup"}
      subtitle={
        isAdmin
          ? `Signed in as ${session.user.email}. Configure AI and manage user accounts.`
          : `Signed in as ${session.user.email}. Configure your AI providers and models.`
      }
    >
      <AdminPanel isAdmin={isAdmin} initialTab={initialTab} />
    </PanelModalShell>
  );
}
