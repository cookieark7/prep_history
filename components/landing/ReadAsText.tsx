"use client";

import * as Dialog from "@radix-ui/react-dialog";
import type { Beat } from "@/lib/landing/types";
import { LANDING_THEME } from "./theme";

/** The accessible version of the opening (prompt 4.7): every beat as an ordered list. */
export function ReadAsText({ beats, open, onOpenChange }: { beats: Beat[]; open: boolean; onOpenChange: (o: boolean) => void }) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className={`${LANDING_THEME} fixed inset-0 z-[60] bg-[color-mix(in_srgb,var(--text)_22%,transparent)]`} />
        <Dialog.Content className={`${LANDING_THEME} fade-up fixed left-1/2 top-[8dvh] z-[61] flex max-h-[84dvh] w-[min(640px,calc(100vw-32px))] -translate-x-1/2 flex-col rounded-[6px] border border-[color:var(--lp-rule)] bg-white shadow-[0_1px_2px_rgba(22,32,28,0.06),0_8px_24px_rgba(22,32,28,0.1)] outline-none`}>
          <div className="flex items-center justify-between border-b border-[color:var(--lp-rule)] px-6 py-4">
            <Dialog.Title className="font-heading text-[20px] font-bold text-[color:var(--lp-ink)]">From the Big Bang to today</Dialog.Title>
            <Dialog.Close className="inline-flex min-h-[44px] items-center font-sans text-[13px] font-medium text-[color:var(--lp-muted)] hover:text-[color:var(--lp-ink)]">
              Close
            </Dialog.Close>
          </div>
          <Dialog.Description className="sr-only">The opening&rsquo;s {beats.length} moments, in order, as text.</Dialog.Description>
          <ol className="scroll-thin overflow-y-auto overscroll-contain px-6 py-4">
            {beats.map((b) => (
              <li key={b.id} className="border-b border-[color:var(--lp-rule)] py-3 last:border-0">
                <p className="tnum text-[12.5px] text-[color:var(--lp-muted)]">{b.label}</p>
                <h3 className="mt-0.5 font-heading text-[18px] font-semibold text-[color:var(--lp-ink)]">{b.title}</h3>
                <p className="mt-1 font-sans text-[16px] leading-[1.5] text-[color:var(--lp-ink)]">{b.caption}</p>
              </li>
            ))}
          </ol>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
