"use client";

import { useState, type FormEvent } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { getAuthClient } from "@/lib/auth";
import { buildStudyHref } from "@/lib/landing/handoff";
import { useLoginCard } from "@/lib/landing/login-store";
import { cancelStart, finishSignIn } from "@/lib/landing/start";
import { PlateWall } from "./PlateWall";
import { LANDING_THEME } from "../theme";

const DONE_MS = 300;

/**
 * The login card (prompt section 5): a calm white card over a slowly drifting wall of plates.
 * Sign-in is a placeholder (TODO(auth)); after it, the waiting question carries on to /study.
 */
export function LoginCard() {
  const open = useLoginCard((s) => s.open);
  return (
    <Dialog.Root open={open} onOpenChange={(o) => { if (!o) { cancelStart(); useLoginCard.getState().close(); } }}>
      <Dialog.Portal>
        <Dialog.Overlay asChild>
          <div className={`${LANDING_THEME} fixed inset-0 z-[70]`}>
            <PlateWall />
          </div>
        </Dialog.Overlay>
        <Dialog.Content
          className={`${LANDING_THEME} login-card fade-up fixed left-1/2 top-1/2 z-[71] w-[min(440px,calc(100vw-32px))] -translate-x-1/2 -translate-y-1/2 rounded-[12px] border border-[color:var(--lp-rule)] bg-[color:var(--lp-card)] p-8 shadow-[0_1px_2px_rgba(22,32,28,0.06),0_12px_32px_rgba(22,32,28,0.12)] outline-none`}
          onCloseAutoFocus={(e) => {
            e.preventDefault();
            useLoginCard.getState().opener?.focus();
          }}
        >
          {/* Keyed on open so every opening starts fresh (no stale "busy" or error). */}
          {open && <CardBody />}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function CardBody() {
  const pending = useLoginCard((s) => s.pending);
  const [busy, setBusy] = useState<"google" | "email" | "guest" | null>(null);
  const [done, setDone] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [weekly, setWeekly] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const signIn = async (how: "google" | "email" | "guest") => {
    setError(null);
    setBusy(how);
    try {
      const auth = getAuthClient();
      const next = pending ? buildStudyHref(pending) : "/study";
      if (how === "google") await auth.signInWithGoogle({ weeklyNote: weekly, next });
      else if (how === "guest") await auth.continueAsGuest();
      else if (!(await auth.signInWithEmail(email, { weeklyNote: weekly, next }))) {
        // real accounts: a link was emailed; opening it finishes the sign-in
        setSentTo(email.trim());
        setBusy(null);
        return;
      }
      setDone(true);
      setTimeout(() => {
        useLoginCard.getState().close();
        finishSignIn(pending);
      }, DONE_MS);
    } catch (e) {
      setError(e instanceof Error ? e.message : "That didn't work. Try again.");
      setBusy(null);
    }
  };
  const onEmail = (e: FormEvent) => {
    e.preventDefault();
    void signIn("email");
  };

  if (sentTo) {
    return (
      <div className="py-6 text-center">
        <Dialog.Title className="font-heading text-[28px] font-bold text-[color:var(--lp-ink)]">Check your email</Dialog.Title>
        <Dialog.Description className="mt-3 font-sans text-[14px] leading-[1.55] text-[color:var(--lp-muted)]">
          We sent a sign-in link to <span className="font-medium text-[color:var(--lp-ink)]">{sentTo}</span>. Open it on this device to carry on{pending ? " with your question" : ""}.
        </Dialog.Description>
        {process.env.NODE_ENV !== "production" && (
          <p className="mt-2 font-sans text-[12px] text-[color:var(--lp-muted)]">Development: the link is printed in the server log.</p>
        )}
        <button type="button" onClick={() => setSentTo(null)} className="mt-5 inline-flex min-h-[44px] items-center px-2 font-sans text-[13px] font-medium text-[color:var(--lp-muted)] underline-offset-4 hover:text-[color:var(--lp-ink)] hover:underline">
          Use a different email
        </button>
      </div>
    );
  }

  if (done) {
    return (
      <div className="py-10 text-center">
        <Dialog.Title className="font-heading text-[28px] font-bold text-[color:var(--lp-ink)]">You&rsquo;re in.</Dialog.Title>
        <Dialog.Description className="sr-only">Taking you to Chronicle.</Dialog.Description>
      </div>
    );
  }

  return (
    <>
      <Dialog.Title className="font-heading text-[28px] font-bold leading-[1.15] text-[color:var(--lp-ink)]">
        {pending ? "Sign in to ask" : "Begin where you’re curious."}
      </Dialog.Title>
      {pending && (
        <p className="mt-2 line-clamp-3 font-heading text-[18px] italic leading-[1.4] text-[color:var(--lp-ink)]">{pending.q}</p>
      )}
      <Dialog.Description className="mt-3 font-sans text-[14px] leading-[1.55] text-[color:var(--lp-muted)]">
        Chronicle turns any history question into a lesson you can explore: causes, timelines, family trees and quizzes.
      </Dialog.Description>

      <button
        type="button"
        disabled={!!busy}
        onClick={() => void signIn("google")}
        className="mt-6 inline-flex h-11 w-full items-center justify-center rounded-[6px] bg-[color:var(--lp-accent)] font-sans text-[14px] font-medium text-white hover:bg-[var(--lp-accent-ink)] disabled:opacity-60"
      >
        {busy === "google" ? "Signing in…" : "Continue with Google"}
      </button>

      <div className="my-5 flex items-center gap-3 font-sans text-[12px] text-[color:var(--lp-muted)]" aria-hidden>
        <span className="h-px flex-1 bg-[color:var(--lp-rule)]" />
        or
        <span className="h-px flex-1 bg-[color:var(--lp-rule)]" />
      </div>

      <form onSubmit={onEmail} className="space-y-2.5" noValidate>
        <label htmlFor="login-email" className="sr-only">Email address</label>
        <input
          id="login-email"
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => { setEmail(e.target.value); setError(null); }}
          aria-invalid={!!error}
          aria-describedby={error ? "login-error" : undefined}
          className="h-11 w-full rounded-[6px] border border-[color:var(--lp-rule)] bg-white px-3 font-sans text-[14px] text-[color:var(--lp-ink)] outline-none placeholder:text-[color:var(--lp-muted)] focus:border-[color:var(--lp-rule-strong)]"
        />
        <button
          type="submit"
          disabled={!!busy || !email.trim()}
          className="inline-flex h-11 w-full items-center justify-center rounded-[6px] border border-[color:var(--lp-rule-strong)] bg-white font-sans text-[14px] font-medium text-[color:var(--lp-ink)] hover:bg-[color:var(--lp-bg)] disabled:opacity-50"
        >
          {busy === "email" ? "Signing in…" : "Continue with email"}
        </button>
        {error && <p id="login-error" role="alert" className="font-sans text-[13px] text-[color:var(--lp-accent)]">{error}</p>}
      </form>

      <div className="mt-5 flex items-center justify-between gap-4">
        <span id="weekly-label" className="font-sans text-[13px] text-[color:var(--lp-ink)]">Send me one short history note a week</span>
        <button
          type="button"
          role="switch"
          aria-checked={weekly}
          aria-labelledby="weekly-label"
          onClick={() => setWeekly((w) => !w)}
          className="relative inline-flex h-11 w-11 shrink-0 items-center justify-center"
        >
          <span className={`relative h-5 w-9 rounded-full transition-colors duration-150 ${weekly ? "bg-[color:var(--lp-accent)]" : "bg-[color:var(--lp-rule-strong)]"}`}>
            <span className={`absolute left-0 top-0.5 h-4 w-4 rounded-full bg-white transition-transform duration-150 ${weekly ? "translate-x-[18px]" : "translate-x-0.5"}`} />
          </span>
        </button>
      </div>

      <div className="mt-4 flex justify-center gap-2">
        <button
          type="button"
          disabled={!!busy}
          onClick={() => void signIn("guest")}
          className="inline-flex min-h-[44px] items-center px-2 font-sans text-[13px] font-medium text-[color:var(--lp-ink)] underline-offset-4 hover:underline disabled:opacity-50"
        >
          {busy === "guest" ? "Starting…" : "Start without an account"}
        </button>
        <Dialog.Close className="inline-flex min-h-[44px] items-center px-2 font-sans text-[13px] font-medium text-[color:var(--lp-muted)] underline-offset-4 hover:text-[color:var(--lp-ink)] hover:underline">
          Later
        </Dialog.Close>
      </div>

      {/* TODO(legal): link real Terms and Privacy pages. */}
      <p className="mt-2 text-center font-sans text-[12px] leading-[1.5] text-[color:var(--lp-muted)]">
        By continuing you agree to the Terms and Privacy Policy (coming soon).
      </p>
    </>
  );
}
