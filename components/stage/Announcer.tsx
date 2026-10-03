"use client";

import { useWorkspace } from "@/lib/store/workspace";

/** aria-live region that announces newly landed blocks and Director replies. */
export function Announcer() {
  const lastLabel = useWorkspace((s) => s.history.at(-1)?.label ?? "");
  const lastSay = useWorkspace((s) => (s.chat.at(-1)?.status === "done" ? s.chat.at(-1)?.text : null));
  const msg = lastSay || lastLabel;

  return <div aria-live="polite" role="status" className="sr-only">{msg}</div>;
}
