import { Suspense } from "react";
import { SpreadsheetStudio } from "@/components/studios/SpreadsheetStudio";

export default function SpreadsheetPage() {
  return (
    <Suspense>
      <SpreadsheetStudio />
    </Suspense>
  );
}
