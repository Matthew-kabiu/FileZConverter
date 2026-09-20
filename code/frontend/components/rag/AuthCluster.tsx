"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { authClient } from "@/lib/auth/client";
import { ROUTES } from "@/lib/routes";
import { rotateRagSessionId } from "@/lib/rag-session";
import { notify } from "@/components/feedback/toast";
import { ChatFab } from "@/components/rag/ChatFab";
import { SetupModal } from "@/components/rag/SetupModal";

/**
 * Bottom-right auth cluster. The chatbot stays visible for guests, but only
 * opens authentication when they try to submit a question.
 */
export function AuthCluster() {
  const { data: session, isPending } = authClient.useSession();
  const searchParams = useSearchParams();
  const mounted = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false,
  );
  const [modalOpen, setModalOpen] = useState(false);
  const [pendingQuestion, setPendingQuestion] = useState<string | null>(null);
  const router = useRouter();

  const user = session?.user as
    | { name?: string | null; email?: string | null; role?: string | null }
    | undefined;
  const authRequested = searchParams.get("auth") === "signin";
  const requestedNext = searchParams.get("next");
  const authDestination =
    requestedNext?.startsWith("/") && !requestedNext.startsWith("//")
      ? requestedNext
      : ROUTES.pages.home;

  useEffect(() => {
    if (!mounted || !authRequested || isPending) return;
    if (user) router.replace(authDestination);
    else {
      const timer = window.setTimeout(() => setModalOpen(true), 0);
      return () => window.clearTimeout(timer);
    }
  }, [authDestination, authRequested, isPending, mounted, router, user]);

  useEffect(() => {
    if (!user || !pendingQuestion) return;
    const timer = window.setTimeout(() => setPendingQuestion(null), 0);
    return () => window.clearTimeout(timer);
  }, [pendingQuestion, user]);

  const closeModal = () => {
    setModalOpen(false);
    if (authRequested) router.replace(ROUTES.pages.home);
  };

  const completeAuth = () => {
    setModalOpen(false);
    if (authRequested) router.replace(authDestination);
    else router.refresh();
  };

  const signOut = async () => {
    try {
      const { error } = await authClient.signOut();
      if (error) {
        notify.error(error, "Failed to sign out. Please try again.");
        return;
      }
      // Drop this browser's session id so the next sign-in starts clean.
      rotateRagSessionId();
      notify.success("Signed out successfully.");
      router.refresh();
    } catch (error) {
      notify.error(error, "Failed to sign out. Please try again.");
    }
  };

  if (!mounted || isPending) return null;

  return (
    <>
      <ChatFab
        key={user?.email ?? "guest"}
        user={user}
        initialDraft={user ? pendingQuestion ?? "" : ""}
        onSignOut={signOut}
        onRequireAuth={(question) => {
          if (question) setPendingQuestion(question);
          setModalOpen(true);
        }}
      />
      {modalOpen && (
        <SetupModal
          onClose={closeModal}
          onAuthed={completeAuth}
        />
      )}
    </>
  );
}
