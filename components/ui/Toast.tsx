"use client";

import { useEffect } from "react";
import { useWorkspace } from "@/lib/store/workspace";
import { Icon } from "./icons";

/** A quiet confirmation (e.g. "Copied …"), announced politely, gone after 1.5s. */
export function Toast() {
  const toast = useWorkspace((s) => s.toast);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => useWorkspace.getState().showToast(null), 1500);
    return () => clearTimeout(t);
  }, [toast]);
  return (
    <div aria-live="polite" role="status" className="pointer-events-none fixed left-1/2 top-16 z-50 -translate-x-1/2">
      {toast && (
        <p key={toast.nonce} className="fade-up inline-flex items-center gap-1.5 rounded-full border border-rule bg-surface px-3 py-1.5 text-[12.5px] shadow-[var(--shadow-float)]">
          <Icon.check size={12} className="text-ok" /> {toast.text}
        </p>
      )}
    </div>
  );
}
