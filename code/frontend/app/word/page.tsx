import { Suspense } from "react";
import { WordStudio } from "@/components/studios/WordStudio";

export default function WordPage() {
  return (
    <Suspense>
      <WordStudio />
    </Suspense>
  );
}
