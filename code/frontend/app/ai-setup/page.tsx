import { redirect } from "next/navigation";
import { PanelModalShell } from "@/components/ui/PanelModalShell";
import { BootstrapForm } from "@/app/ai-setup/BootstrapForm";
import { getSession, isBootstrapNeeded } from "@/lib/auth/session";
import { getSignInRoute, ROUTES } from "@/lib/routes";

/** First-run bootstrap entry; established accounts use the unified panel. */
export default async function AiSetupPage() {
  if (await isBootstrapNeeded()) {
    return (
      <PanelModalShell
        title="First-run setup"
        subtitle="Create the admin account. Afterwards signup closes and this locks."
      >
        <div className="mx-auto max-w-md">
          <BootstrapForm />
        </div>
      </PanelModalShell>
    );
  }
  const session = await getSession();
  if (!session) redirect(getSignInRoute(ROUTES.pages.adminAi));
  redirect(ROUTES.pages.adminAi);
}
