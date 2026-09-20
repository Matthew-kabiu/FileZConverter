"use client";

import { useState } from "react";
import { SiteCtaFaq } from "@/components/site/SiteCtaFaq";
import { SiteFooter } from "@/components/site/SiteFooter";
import { LegalModal, type LegalDoc } from "@/components/site/LegalModals";

/** Global below-the-fold chrome: CTA + FAQ, footer, and legal modals. */
export function SiteExtras() {
  const [legal, setLegal] = useState<LegalDoc | null>(null);

  return (
    <>
      <SiteCtaFaq />
      <SiteFooter
        onPrivacy={() => setLegal("privacy")}
        onTerms={() => setLegal("terms")}
      />
      {legal && <LegalModal doc={legal} onClose={() => setLegal(null)} />}
    </>
  );
}
