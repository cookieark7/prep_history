"use client";

import { useEffect, useState, type FormEvent, type KeyboardEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BEATS } from "@/content/landing/beats";
import { PARTS, stationById, stationsOf } from "@/content/syllabus";
import { ACCOUNTS, getAuthClient, useSession } from "@/lib/auth";
import { useLoginCard } from "@/lib/landing/login-store";
import { requestStart, setNavigator } from "@/lib/landing/start";
import type { PromptKind } from "@/lib/landing/handoff";
import { useRoute, useRouteHydrated } from "@/lib/syllabus/route";
import { ThemeSync } from "@/components/ui/hydration";
import { ThemeButton } from "@/components/shell/AppShell";
import { RouteLine, RouteList } from "@/components/route/RouteLine";
import { StationDetails } from "@/components/route/StationDetails";
import { Icon } from "@/components/ui/icons";
import { OpeningWindow } from "./opening/OpeningWindow";
import { ReadAsText } from "./ReadAsText";
import { LoginCard } from "./login/LoginCard";
import { LANDING_THEME } from "./theme";
import "./landing.css";

// How a lens shapes a question typed on the homepage, and the kind it hands over.
const LENSES: { id: string; label: string; suffix: string; kind: PromptKind }[] = [
  { id: "story", label: "Story", suffix: "tell it as a story", kind: "free" },
  { id: "timeline", label: "Timeline", suffix: "a timeline of the main events", kind: "when" },
  { id: "people", label: "People", suffix: "the key people and what each did", kind: "who" },
  { id: "places", label: "Places", suffix: "the key places and why they mattered", kind: "free" },
  { id: "causes", label: "Cause and effect", suffix: "what caused it and what it led to", kind: "why" },
];

// Three ways in from the syllabus, one from each part of Indian history.
const TRY = [
  { station: "harappan", q: 0 },
  { station: "marathas", q: 1 },
  { station: "revolt-1857", q: 0 },
] as const;

const WRAP = "mx-auto w-full max-w-[1240px] px-[clamp(16px,4vw,40px)]";

/**
 * The public homepage (.impeccable/surfaces/app-page-tsx.md): the slideshow in a rounded box at
 * the top, then the headline and the question box with its lenses and three syllabus questions,
 * then the syllabus as the same line the app uses. Light and dark follow the visitor's setting.
 */
export function Landing() {
  const router = useRouter();
  const session = useSession();
  const [readOpen, setReadOpen] = useState(false);

  // Handoffs navigate with Next's router so /study opens without a full reload.
  useEffect(() => setNavigator((href) => router.push(href)), [router]);

  const signIn = () => useLoginCard.getState().openLogin(null);

  return (
    <div className={`${LANDING_THEME} lp-page`}>
      <ThemeSync />
      <a href="#syllabus" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[90] focus:rounded-[6px] focus:bg-bg focus:px-3 focus:py-2 focus:text-[13px]">
        Skip to the syllabus
      </a>

      <header className="lp-header">
        <div className="lp-header-in">
          <a href="#top" className="lp-logo">Chronicle</a>
          <nav className="lp-nav" aria-label="Main">
            <a href="#syllabus" className="lp-nav-wide">The syllabus</a>
            <button type="button" onClick={() => setReadOpen(true)} className="lp-nav-wide">Read as text</button>
            <ThemeButton compact className="lp-icon" />
            {/* a guest has a session but no account yet: offer both */}
            {(!session || session.provider === "guest") && <button type="button" onClick={signIn}>Sign in</button>}
            <Link href="/start" className="lp-cta">{session && session.provider !== "guest" ? "Open Chronicle" : "Start learning"}</Link>
          </nav>
        </div>
      </header>

      <main id="top">
        <section aria-labelledby="moments-h" className={`${WRAP} pt-[clamp(12px,2vw,24px)]`}>
          <h2 id="moments-h" className="sr-only">From the Big Bang to now, in 35 moments</h2>
          <OpeningWindow
            aside={
              <button type="button" onClick={() => setReadOpen(true)} className="ml-auto inline-flex min-h-[44px] shrink-0 items-center text-[15px] font-medium text-accent underline-offset-4 hover:underline">
                Read all 35 moments as text
              </button>
            }
          />
        </section>

        <section aria-labelledby="hero-h" className={`${WRAP} pb-[clamp(48px,7vw,88px)] pt-[clamp(20px,3vw,40px)]`}>
          <h1 id="hero-h" className="max-w-[16em] text-[clamp(36px,4.6vw,56px)] font-bold leading-[1.05] tracking-[-0.02em] [text-wrap:balance]">
            History for UPSC, learned once and kept till exam day.
          </h1>
          <p className="mt-4 max-w-[44em] text-[clamp(17px,1.5vw,19.5px)] leading-[1.5] text-muted">
            Ask about any topic, person, place or year. You get a lesson built for your question, every claim marked by how certain it is, and a short daily review of what to remember.
          </p>
          <HeroAsk />
          <ul className="mt-7 grid gap-x-8 gap-y-1 md:grid-cols-3" aria-label="Questions from the syllabus">
            {TRY.map(({ station, q }) => {
              const s = stationById(station)!;
              return (
                <li key={station} className="border-t border-rule">
                  <button type="button" onClick={() => requestStart({ q: s.questions[q], kind: "free" })} className="group block w-full py-3 text-left">
                    <span className="inline-block border-2 border-line bg-board px-1.5 pb-0.5 pt-1 text-[14px] text-board-ink board-type">{s.name}</span>
                    <span className="mt-2 block text-[16.5px] font-medium leading-snug group-hover:text-accent">{s.questions[q]}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>

        <SyllabusSection />
      </main>

      <footer className="lp-footer">
        <div className="lp-footer-in">
          <span className="lp-logo text-[18px]">Chronicle</span>
          <span>Illustrations are AI-generated.</span>
          {/* TODO(legal): real Terms and Privacy pages. */}
          <span>Terms and Privacy Policy (coming soon)</span>
        </div>
      </footer>

      <ReadAsText beats={BEATS} open={readOpen} onOpenChange={setReadOpen} />
      <LoginCard />
      {process.env.NODE_ENV !== "production" && <DevBadge signedIn={!!session} guest={session?.provider === "guest"} />}
    </div>
  );
}

/** The question box: what to ask, and optionally the lens to see it through. */
function HeroAsk() {
  const [q, setQ] = useState("");
  const [lens, setLens] = useState<string | null>(null);
  const chosen = LENSES.find((l) => l.id === lens);
  const submit = (e?: FormEvent) => {
    e?.preventDefault();
    const t = q.trim();
    if (!t) return;
    requestStart({ q: chosen ? `${t}: ${chosen.suffix}` : t, kind: chosen?.kind ?? "free" });
  };
  const onKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); submit(); }
  };

  return (
    <form onSubmit={submit} className="mt-7 rounded-[14px] border-[1.5px] border-line bg-bg p-[clamp(12px,1.6vw,20px)] transition-shadow focus-within:shadow-[0_0_0_4px_var(--accent-soft)]">
      <label htmlFor="hero-ask" className="sr-only">Ask about any topic, person, place or year</label>
      <textarea
        id="hero-ask"
        rows={2}
        maxLength={1000}
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onKeyDown={onKey}
        placeholder="Ask about any topic, person, place or year"
        className="block min-h-[64px] w-full resize-none bg-transparent px-1 text-[clamp(17.5px,1.6vw,21px)] leading-[1.4] outline-none! placeholder:text-muted"
      />
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="See it through a lens (optional)">
          {LENSES.map((l) => (
            <button
              key={l.id}
              type="button"
              aria-pressed={lens === l.id}
              onClick={() => setLens(lens === l.id ? null : l.id)}
              className={`h-10 rounded-lg px-3.5 text-[15px] font-semibold transition-[background-color,color,transform] duration-150 active:scale-[0.97] ${
                lens === l.id ? "bg-text text-bg" : "bg-sunk text-text hover:bg-hover"
              }`}
            >
              {l.label}
            </button>
          ))}
        </div>
        <button
          type="submit"
          disabled={!q.trim()}
          className="ml-auto inline-flex h-12 items-center gap-2 rounded-lg bg-accent px-5 text-[16.5px] font-semibold text-bg transition-[background-color,transform] duration-150 hover:bg-accent-ink active:scale-[0.97] disabled:bg-sunk disabled:text-muted"
        >
          Ask <Icon.arrowRight size={16} />
        </button>
      </div>
    </form>
  );
}

/** The syllabus as the app draws it: the same line, boards and questions as the app's home. */
function SyllabusSection() {
  const ready = useRouteHydrated();
  const part = useRoute((s) => s.part);
  const stationId = useRoute((s) => s.station);
  const started = useRoute((s) => s.started);
  const stations = stationsOf(part);
  const here = stationById(stationId) ?? stations[0];
  const label = `${PARTS.find((p) => p.id === part)?.label} stations`;
  const ask = (message: string) => requestStart({ q: message, kind: "free" });

  return (
    <section id="syllabus" aria-labelledby="syllabus-h" className="scroll-mt-20 border-t border-rule bg-frame py-[clamp(48px,7vw,88px)]">
      <div className={WRAP}>
        <h2 id="syllabus-h" className="text-[clamp(26px,3vw,36px)] font-bold tracking-[-0.015em]">Find your place in the syllabus</h2>
        <p className="mt-2 max-w-[44em] text-[17px] text-muted">GS Paper I history as one line, from the Stone Age to the Cold War. Pick a station to see where to start.</p>
        <div className="mt-8 flex overflow-x-auto border-b border-rule scroll-thin" role="group" aria-label="Part of the syllabus">
          {PARTS.map((p) => (
            <button
              key={p.id}
              type="button"
              aria-pressed={part === p.id}
              onClick={() => useRoute.getState().setPart(p.id)}
              className={`-mb-px h-11 shrink-0 whitespace-nowrap border-b-2 px-3 text-[15px] ${part === p.id ? "border-line font-semibold text-text" : "border-transparent text-muted hover:text-text"}`}
            >
              {p.label}
            </button>
          ))}
        </div>
        {ready ? (
          <>
            <div className="mt-8 hidden lg:block">
              <RouteLine stations={stations} current={here.id} started={started} onSelect={(id) => useRoute.getState().setStation(id)} label={label} />
              <div className="mt-6 max-w-[900px]"><StationDetails station={here} onAsk={ask} /></div>
            </div>
            <div className="mt-4 lg:hidden">
              <RouteList stations={stations} current={here.id} started={started} onSelect={(id) => useRoute.getState().setStation(id)} label={label} details={(s) => <StationDetails station={s} onAsk={ask} />} />
            </div>
          </>
        ) : (
          <div aria-hidden className="h-[460px]" />
        )}
      </div>
    </section>
  );
}

/** Dev only: which auth this page runs on, and a quick way to sign out. */
function DevBadge({ signedIn, guest }: { signedIn: boolean; guest: boolean }) {
  return (
    <div className="fixed bottom-1 right-1 z-[80] rounded-[4px] bg-[rgba(22,32,28,0.72)] px-2 py-0.5 font-mono text-[10px] text-[#E3E9E4]">
      auth: {ACCOUNTS ? "accounts" : "placeholder"}{signedIn ? (guest ? " (guest) · " : " (signed in) · ") : " · "}
      {signedIn ? (
        <button type="button" className="underline" onClick={() => void getAuthClient().signOut()}>sign out</button>
      ) : (
        "inference: /api/turn"
      )}
    </div>
  );
}
