import { Suspense } from "react";
import { Workspace } from "@/components/stage/Workspace";
import { HandoffReader } from "@/components/stage/HandoffReader";

export const metadata = { title: "Chronicle — Study" };

export default function StudyPage() {
  return (
    <>
      <Suspense fallback={null}>
        <HandoffReader />
      </Suspense>
      <Workspace />
    </>
  );
}
