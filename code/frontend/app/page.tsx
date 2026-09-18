import { Suspense } from "react";
import { MarkdownStudio } from "@/components/studios/MarkdownStudio";

export default function Home() {
  return (
    <Suspense>
      <MarkdownStudio />
    </Suspense>
  );
}
