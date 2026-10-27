"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { Icon, type IconName } from "@/components/ui/icons";
import { useHydrated, ThemeSync, AccountSync } from "@/components/ui/hydration";
import { useWorkspace } from "@/lib/store/workspace";
import { openLesson, useLessonList } from "@/lib/store/sync";
import { useReviewStats, waitingCount } from "@/lib/review/useReviewStats";

export type Place = "learn" | "review" | "progress";

const PLACES: { id: Place; href: string; label: string; icon: IconName }[] = [
  { id: "learn", href: "/start", label: "Learn", icon: "learn" },
  { id: "review", href: "/review", label: "Review", icon: "review" },
  { id: "progress", href: "/stats", label: "Progress", icon: "progress" },
];

/**
 * The app frame: a light sidebar on laptops (places, recent lessons, theme), and on phones a top
 * bar with the same places as tabs along the bottom, so neither is the lesser version.
 */
export function AppShell({ place, children }: { place: Place; children: ReactNode }) {
  const hydrated = useHydrated();
  const waiting = waitingCount(useReviewStats(hydrated));

  return (
    <div className="min-h-dvh bg-bg md:grid md:grid-cols-[240px_minmax(0,1fr)]">
      <ThemeSync />
      <AccountSync />
      <aside className="sticky top-0 hidden h-dvh flex-col border-r border-rule bg-frame px-3 pb-4 pt-5 md:flex">
        <Wordmark className="px-2.5" />
        <nav aria-label="Main" className="mt-6">
          <ul className="space-y-0.5">
            {PLACES.map((p) => (
              <li key={p.id}>
                <Link
                  href={p.href}
                  aria-current={place === p.id ? "page" : undefined}
                  className={`flex h-9 items-center gap-2.5 rounded-md px-2.5 text-[14.5px] ${place === p.id ? "bg-hover font-semibold text-text" : "text-muted hover:bg-hover hover:text-text"}`}
                >
                  <PlaceIcon name={p.icon} size={16} />
                  {p.label}
                  {p.id === "review" && waiting > 0 && <DueChip n={waiting} />}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <RecentLessons hydrated={hydrated} />
        <ThemeButton className="mt-auto" />
      </aside>

      <header className="sticky top-0 z-20 flex h-12 items-center justify-between border-b border-rule bg-bg/95 px-4 backdrop-blur md:hidden">
        <Wordmark />
        <ThemeButton compact />
      </header>

      <div className="min-w-0 pb-[calc(64px+env(safe-area-inset-bottom))] md:pb-0">{children}</div>

      <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-20 border-t border-rule bg-bg pb-[env(safe-area-inset-bottom)] md:hidden">
        <ul className="grid grid-cols-3">
          {PLACES.map((p) => (
            <li key={p.id}>
              <Link
                href={p.href}
                aria-current={place === p.id ? "page" : undefined}
                className={`relative flex h-16 flex-col items-center justify-center gap-1 text-[12.5px] ${place === p.id ? "font-semibold text-text" : "text-muted"}`}
              >
                <span className="relative">
                  <PlaceIcon name={p.icon} size={20} />
                  {p.id === "review" && waiting > 0 && <DueChip n={waiting} className="absolute -right-4 -top-2" />}
                </span>
                {p.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}

/** The three places as a compact row, for the lesson page's chat dock. */
export function PlaceLinks() {
  const waiting = waitingCount(useReviewStats(true));
  return (
    <nav aria-label="Main" className="px-3 pb-2">
      <ul className="flex gap-0.5">
        {PLACES.map((p) => (
          <li key={p.id}>
            <Link href={p.href} className="flex h-9 items-center gap-2 rounded-md px-2.5 text-[14px] text-muted hover:bg-hover hover:text-text">
              <PlaceIcon name={p.icon} size={15} />
              {p.label}
              {p.id === "review" && waiting > 0 && <DueChip n={waiting} />}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

function PlaceIcon({ name, size }: { name: IconName; size: number }) {
  const I = Icon[name];
  return <I size={size} />;
}

function Wordmark({ className = "" }: { className?: string }) {
  return (
    <Link href="/start" className={`board-type text-[21px] text-text ${className}`}>
      Chronicle
    </Link>
  );
}

/** The count of cards waiting, on a scrap of station-board yellow. */
export function DueChip({ n, className = "" }: { n: number; className?: string }) {
  return (
    <span className={`ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-[3px] bg-board px-1.5 text-[12px] font-bold text-board-ink tnum ${className}`}>
      <span className="sr-only">, </span>{n}<span className="sr-only"> waiting</span>
    </span>
  );
}

function RecentLessons({ hydrated }: { hydrated: boolean }) {
  const router = useRouter();
  const recent = useLessonList(hydrated).slice(0, 6);
  if (!recent.length) return null;
  return (
    <section className="mt-7 min-h-0 overflow-y-auto scroll-thin">
      <h2 className="px-2.5 pb-1 text-[12.5px] font-semibold text-muted">Recent lessons</h2>
      <ul className="space-y-px">
        {recent.map((r) => (
          <li key={r.id}>
            <button
              type="button"
              onClick={() => { void openLesson(r.id).then((ok) => ok && router.push("/study")); }}
              className="block h-8 w-full truncate rounded-md px-2.5 text-left text-[14px] text-muted hover:bg-hover hover:text-text"
            >
              {r.topic}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function ThemeButton({ compact = false, className = "" }: { compact?: boolean; className?: string }) {
  // the server renders light; the saved theme is known only once the store has loaded
  const saved = useWorkspace((s) => s.theme);
  const theme = useHydrated() ? saved : "light";
  const next = theme === "dark" ? "light" : "dark";
  return (
    <button
      type="button"
      onClick={() => useWorkspace.getState().setTheme(next)}
      aria-label={`Switch to the ${next} theme`}
      className={`flex items-center gap-2.5 rounded-md text-[14px] text-muted hover:bg-hover hover:text-text ${compact ? "h-10 w-10 justify-center" : "h-9 px-2.5"} ${className}`}
    >
      <Icon.theme size={16} />
      {!compact && <span>{next === "dark" ? "Dark theme" : "Light theme"}</span>}
    </button>
  );
}
