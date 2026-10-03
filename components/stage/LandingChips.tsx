"use client";

import { useEffect, useRef, useState } from "react";
import { useWorkspace } from "@/lib/store/workspace";
import { chipLabel, landingDirection, LANDING_CHIP_MS, type PendingLanding } from "@/lib/landing";
import { scrollToBlock } from "@/components/blocks/Markdown";
import { Icon } from "@/components/ui/icons";

/**
 * The Stage never auto-scrolls. When a block lands outside the viewport, this chip says so
 * ("Cause graph added, below"); several collapse into one. Click jumps to the first one.
 * A pending block drops off when it scrolls into view; the chip times out after 8s.
 * Patches never raise a chip.
 */
export function LandingChips() {
  const history = useWorkspace((s) => s.history);
  const flashBlock = useWorkspace((s) => s.flashBlock);
  const [pending, setPending] = useState<PendingLanding[]>([]);
  const seen = useRef(history.length);

  // new "add" entries -> check where the block landed once it has rendered
  useEffect(() => {
    const fresh = history.slice(seen.current).filter((h) => h.op === "add" && h.blockId && h.inverse);
    seen.current = history.length;
    if (!fresh.length) return;
    const t = setTimeout(() => {
      const blocks = useWorkspace.getState().blocks;
      const add: PendingLanding[] = [];
      for (const h of fresh) {
        const el = document.getElementById(`block-${h.blockId}`);
        const b = blocks.find((x) => x.id === h.blockId);
        if (!el || !b) continue;
        const dir = landingDirection(el.getBoundingClientRect(), window.innerHeight);
        if (dir) add.push({ id: b.id, type: b.type, dir });
      }
      if (add.length) setPending((cur) => [...cur.filter((p) => !add.some((a) => a.id === p.id)), ...add]);
    }, 0);
    return () => clearTimeout(t);
  }, [history]);

  // drop blocks as they come into view; time the chip out
  useEffect(() => {
    if (!pending.length) return;
    const io = new IntersectionObserver((entries) => {
      const visible = entries.filter((e) => e.isIntersecting).map((e) => (e.target as HTMLElement).dataset.block);
      if (visible.length) setPending((cur) => cur.filter((p) => !visible.includes(p.id)));
    }, { rootMargin: "-64px 0px 0px 0px" });
    for (const p of pending) {
      const el = document.getElementById(`block-${p.id}`);
      if (el) io.observe(el);
    }
    const t = setTimeout(() => setPending([]), LANDING_CHIP_MS);
    return () => { io.disconnect(); clearTimeout(t); };
  }, [pending]);

  const label = chipLabel(pending);
  if (!label) return null;
  const first = pending[0];
  return (
    <div className="pointer-events-none sticky bottom-[200px] z-10 mt-6 flex justify-center md:bottom-6">
      <button
        type="button"
        onClick={() => { scrollToBlock(first.id, null, flashBlock); setPending([]); }}
        className="fade-up pointer-events-auto inline-flex min-h-9 items-center gap-1.5 rounded-full border border-rule bg-surface px-3.5 text-[12.5px] text-text shadow-[var(--shadow-float)] hover:border-rule-strong"
      >
        {first.dir === "above" ? <Icon.chevronUp size={13} /> : <Icon.chevronDown size={13} />}
        {label}
      </button>
    </div>
  );
}
