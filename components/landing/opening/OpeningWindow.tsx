"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import gsap from "gsap";
import { BEATS } from "@/content/landing/beats";
import plates from "@/content/landing/opening-plates.json";
import { buildOpeningPlan, OPENING_CONFIG, rulerIndexAt, slotIndexAt, slotProgress, span, unitsPerSecond } from "@/lib/landing/opening-plan";
import { prefersReducedMotion, useReducedMotion } from "@/lib/landing/motion";
import { loadPlate, Plate } from "@/components/landing/Plate";
import "./opening.css";

// The opening in the homepage's rounded box (.impeccable/surfaces/app-page-tsx.md): at the top of
// the page, landscape on wide screens and 4:5 on tall ones. A clock drives `render(p)`: Act I flies
// down through deep time, Act II cuts through history, and it closes on "Now", fades to dark and
// begins again. One small pause / play button (WCAG 2.2.2); it also pauses while scrolled out of
// view. With reduced motion it waits on the first frame until the reader presses play.
//
// Smoothness (24 Oct 2026): every frame writes only transform and opacity; the next plate is
// promoted to its own layer a cut ahead, so no layer is created at the moment it fades in; the
// bloom runs on the compositor (WAAPI), so the page's own start-up work cannot stall it; and the
// clock starts only once the page has loaded and gone idle.

type PlayState = "playing" | "paused";

const AHEAD = 8; // plates fetched and decoded ahead of the current one
const HOLD_END_S = 0.4; // on "Now" before it fades to dark and begins again
const EASE_OUT = "cubic-bezier(0.23, 1, 0.32, 1)";

/** Soft in and out, so a crossfade has no hard start or stop. */
const smooth = (x: number) => x * x * (3 - 2 * x);

export function OpeningWindow({ aside }: { aside?: ReactNode }) {
  const plan = useMemo(() => buildOpeningPlan(BEATS, plates.plates), []);
  const byId = useMemo(() => new Map(BEATS.map((b) => [b.id, b])), []);
  const last = plan.slots.length - 1;
  // Act I: the arrival plate, then the nested zoom levels; each step's zoom factor (the last one
  // keeps flying into the clouds while the white-out rises).
  const chainIds = useMemo(() => ["B01", ...(plates.zoom?.levels ?? [])], []);
  const chainFactors = useMemo(() => [3, ...(plates.zoom?.zoom ?? []), 3], []);
  const chainEls = useRef<(HTMLImageElement | null)[]>([]);

  const figRef = useRef<HTMLElement>(null);
  const bloomRef = useRef<HTMLDivElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);
  const imgs = useRef<(HTMLImageElement | null)[]>([]);
  const whiteRef = useRef<HTMLDivElement>(null);
  const fadeRef = useRef<HTMLDivElement>(null);
  const dateRef = useRef<HTMLParagraphElement>(null);
  const titleRef = useRef<HTMLParagraphElement>(null);
  const capRef = useRef<HTMLParagraphElement>(null);
  const needleRef = useRef<HTMLSpanElement>(null);
  // With reduced motion it starts paused; once the reader presses the button, their choice wins.
  const reducedPref = useReducedMotion();
  const [chosen, setPlay] = useState<PlayState | null>(null);
  const play: PlayState = chosen ?? (reducedPref ? "paused" : "playing");
  const control = useRef<{ toggle: () => void } | null>(null);

  useEffect(() => {
    const fig = figRef.current;
    if (!fig) return;
    const cfg = OPENING_CONFIG;
    const ups = unitsPerSecond(cfg);
    const reduced = prefersReducedMotion();
    const shown = new Set<number>();
    let lastId = "";
    let lastP = 0;
    let stopped = false;
    const refresh = () => { if (!stopped) render(lastP); }; // a plate arrived: show it even if paused

    // Plates load just ahead of the reader; the rest arrive one by one in the background.
    const near = new Set<number>();
    let started = !reduced; // with reduced motion nothing loads until the reader presses play
    const ensure = (from: number) => {
      if (!started) return;
      for (let k = from; k < Math.min(from + AHEAD, plan.slots.length); k++) {
        const el = imgs.current[k];
        if (el && !near.has(k)) { near.add(k); void loadPlate(el).then(() => el.decode()).then(refresh, () => {}); }
      }
    };

    const show = (want: Map<number, { o: number; s: number }>) => {
      for (const k of shown) {
        if (!want.has(k)) {
          const el = imgs.current[k];
          if (el) { el.style.opacity = "0"; el.classList.remove("is-on"); }
          shown.delete(k);
        }
      }
      for (const [k, v] of want) {
        const el = imgs.current[k];
        if (!el) continue;
        if (!shown.has(k)) { el.classList.add("is-on"); shown.add(k); }
        el.style.opacity = String(v.o);
        el.style.transform = `scale(${v.s.toFixed(4)})`;
      }
    };

    // Act I's nested zoom: level k zooms by factor[k] into its own centre, where level k + 1 is
    // waiting at 1 / factor[k] scale behind a soft circle; at the end of the step it is full size.
    const showChain = (c: number | null) => {
      const els = chainEls.current;
      if (c === null) {
        els.forEach((el) => { if (el && el.style.opacity !== "0") el.style.opacity = "0"; });
        return;
      }
      const k = Math.min(chainIds.length - 1, Math.floor(c));
      const u = c - k;
      const f = chainFactors[k];
      // On a slow network a level may not be here yet: keep flying into the deepest one that is.
      let m = k;
      let held = 1;
      while (m > 0 && !ready(els[m])) { m--; held *= chainFactors[m]; }
      const sc = held * f ** u; // exponential, so the flight keeps a constant apparent speed
      els.forEach((el, j) => {
        if (!el) return;
        // the level on screen and the one coming up keep their own layer while they scale
        el.classList.toggle("is-live", j === m || j === m + 1);
        if (j === m) {
          el.style.opacity = "1";
          el.style.transform = `scale(${sc.toFixed(4)})`;
          el.classList.remove("is-masked");
        } else if (j === k + 1 && m === k && u > 0.4 && ready(el)) {
          el.style.opacity = smooth(span(u, 0.4, 0.95)).toFixed(3);
          el.style.transform = `scale(${(sc / f).toFixed(4)})`;
          el.classList.add("is-masked");
        } else if (el.style.opacity !== "0") {
          el.style.opacity = "0";
        }
      });
    };

    const render = (p: number) => {
      lastP = p;
      const i = slotIndexAt(plan, p);
      const s = plan.slots[i];
      const local = slotProgress(plan, i, p);
      ensure(i);

      // ---- plates
      const want = new Map<number, { o: number; s: number }>();
      let waiting = false; // nothing in Act II has loaded yet: stay in the white-out
      const deepFrom = plan.slots[1].start;
      showChain(s.act !== "deep" ? null
        : i === 0 ? span(local, 0.5, 1)
        : 1 + (chainIds.length - 1) * span(p, deepFrom, cfg.deepEnd));
      if (s.act === "landing") {
        // "Now" has no picture of its own: keep pushing in on the last one while the label says it.
        want.set(i - 1, { o: 1, s: 1.05 + 0.04 * local });
      } else if (s.act === "history") {
        // Act II: a slow push-in on each plate, a quick dissolve into the next.
        if (!ready(imgs.current[i])) {
          let k = i - 1;
          while (k >= 0 && !ready(imgs.current[k])) k--;
          if (k >= 0) want.set(k, { o: 1, s: 1.05 });
          else waiting = true;
        }
        want.set(i, { o: 1, s: 1 + (s.key ? 0.05 : 0.04) * local });
        const next = plan.slots[i + 1];
        if (next && next.act === "history") {
          // the crossfade lasts fadeSeconds whatever the plate's length; the next plate is on its
          // own layer (at opacity 0) for the whole cut before it, so nothing is created mid-fade
          const slotSeconds = (s.end - s.start) / ups.history;
          const f = span(local, 1 - Math.min(0.45, cfg.fadeSeconds / slotSeconds), 1);
          want.set(i + 1, { o: smooth(f), s: 1 });
        }
      }
      show(want);

      // ---- the white-out between the acts
      const wide = p < cfg.deepEnd ? cfg.whiteout : cfg.whiteout * (ups.history / ups.deep);
      const w = waiting ? 1 : 1 - Math.min(1, Math.abs(p - cfg.deepEnd) / wide);
      if (whiteRef.current) whiteRef.current.style.opacity = w.toFixed(3);

      // ---- the label under the window: date and title always, the cause at key moments
      const b = byId.get(s.id)!;
      if (b.id !== lastId) {
        lastId = b.id;
        if (dateRef.current) dateRef.current.textContent = b.label;
        if (titleRef.current) titleRef.current.textContent = b.title;
        if (capRef.current) capRef.current.textContent = s.key || s.act === "landing" ? b.caption : "";
      }
      if (capRef.current) {
        const o = s.key || s.act === "landing" ? Math.min(span(local, 0.06, 0.22), s.act === "landing" ? 1 : 1 - span(local, 0.8, 0.97)) : 0;
        capRef.current.style.opacity = o.toFixed(3);
      }

      // ---- the needle on the ruler
      if (needleRef.current) needleRef.current.style.transform = `translateX(${((rulerIndexAt(plan, p) / last) * 100).toFixed(3)}%)`;
    };

    // Act I plays first: fetch and decode it now. Once the page has loaded, every other plate
    // follows in order, one at a time at low priority.
    const pageLoaded = new Promise<void>((done) => {
      if (document.readyState === "complete") done();
      else window.addEventListener("load", () => done(), { once: true });
    });
    if (!reduced) {
      void (async () => {
        await Promise.all(chainEls.current.map((el) => el && loadPlate(el).then(() => el.decode()).then(refresh, () => {})));
        await pageLoaded;
        for (let k = 0; k < plan.slots.length && !stopped; k++) {
          const el = imgs.current[k];
          if (el && !near.has(k)) { await loadPlate(el, true); refresh(); }
        }
      })();
    }

    // One loop: the bloom, the three acts at their own speeds, a hold on "Now", a fade to dark,
    // and again. The bloom is two compositor animations (scale on the first plate, opacity on a
    // glow over it), so it stays smooth while the page is still starting up.
    const state = { p: 0 };
    const bloomS = cfg.bloomMs / 1000;
    let bloom: Animation[] = [];
    const startBloom = () => {
      bloom.forEach((a) => a.cancel());
      const opts = { duration: cfg.bloomMs, easing: EASE_OUT, fill: "both" as const };
      bloom = [
        bloomRef.current?.animate([{ transform: "scale(1.06)" }, { transform: "scale(1)" }], opts),
        glowRef.current?.animate([{ opacity: 0.55 }, { opacity: 0 }], opts),
      ].filter((x): x is Animation => !!x);
    };
    const onUpdate = () => render(state.p);
    const tl = gsap.timeline({ paused: true, repeat: -1 });
    tl.call(startBloom, [], 0);
    tl.to(state, { p: cfg.deepEnd, duration: cfg.actSeconds.deep, ease: "none", onUpdate }, bloomS);
    tl.to(state, { p: cfg.historyEnd, duration: cfg.actSeconds.history, ease: "none", onUpdate });
    tl.to(state, { p: cfg.total, duration: cfg.actSeconds.landing, ease: "none", onUpdate });
    tl.to(fadeRef.current, { opacity: 1, duration: 0.7, ease: "power1.in" }, `+=${HOLD_END_S}`);
    tl.call(() => { state.p = 0; render(0); });
    tl.to(fadeRef.current, { opacity: 0, duration: 0.6, ease: "power1.out" });
    render(0);

    let userPaused = reduced; // with reduced motion it waits for the reader to press play
    let inView = true;
    let primed = false; // the clock starts once the page has loaded and gone idle
    const sync = () => {
      const run = primed && !userPaused && inView;
      if (run) tl.play(); else tl.pause();
      bloom.forEach((a) => (run ? a.playState === "paused" && a.play() : a.playState === "running" && a.pause()));
    };
    control.current = {
      toggle: () => {
        userPaused = !userPaused;
        setPlay(userPaused ? "paused" : "playing");
        if (!userPaused && !started) {
          // the reader chose to watch: start loading what it needs
          started = true;
          chainEls.current.forEach((el) => el && void loadPlate(el).then(refresh));
          render(lastP);
        }
        primed = true; // a press always counts, even before the page went idle
        sync();
      },
    };

    // Pause while it is scrolled away; carry on when the reader comes back. A strip of the box in
    // view is enough to play.
    const io = new IntersectionObserver(([e]) => { inView = e.intersectionRatio > 0.15; sync(); }, { threshold: [0, 0.15, 0.5] });
    io.observe(fig);
    const idle = () => new Promise<void>((done) => {
      if ("requestIdleCallback" in window) requestIdleCallback(() => done(), { timeout: 1200 });
      else setTimeout(done, 300);
    });
    void pageLoaded.then(idle).then(() => { if (!stopped) { primed = true; sync(); } });

    return () => {
      io.disconnect();
      stopped = true;
      control.current = null;
      tl.kill();
      bloom.forEach((a) => a.cancel());
    };
  }, [plan, byId, last, chainIds, chainFactors]);

  const first = BEATS[0];
  return (
    <figure ref={figRef} className="ow" aria-label="From the Big Bang to today, in 35 moments">
      <div className="ow-frame">
        <div className="ow-plates" aria-hidden>
          {/* Act I: the arrival plate and the nested zoom levels, stacked; showChain() drives them. */}
          {chainIds.map((id, j) => {
            const ref = (el: HTMLImageElement | null) => { chainEls.current[j] = el; };
            return j === 0 ? (
              <div key={id} ref={bloomRef} className="ow-bloom">
                <Plate id={id} imgRef={ref} className="ow-plate ow-zoom" style={{ opacity: 1 }} />
                <div ref={glowRef} className="ow-glow" />
              </div>
            ) : (
              <Plate key={id} id={id} zoom deferred imgRef={ref} className="ow-plate ow-zoom" />
            );
          })}
          {/* Act II: one plate per beat; render() cuts between them. */}
          {plan.slots.map((s, k) => (s.act !== "history" ? null : (
            <Plate key={s.id} id={s.id} deferred imgRef={(el) => { imgs.current[k] = el; }} className="ow-plate" />
          )))}
        </div>
        <div ref={whiteRef} className="ow-white" aria-hidden />
        <div ref={fadeRef} className="ow-fade" aria-hidden />
        <div className="ow-shade" aria-hidden />

        {/* the moment on a station board, top left; the pause button, top right */}
        <div className="ow-over" aria-hidden>
          <p ref={dateRef} className="ow-date">{first.label}</p>
          <p ref={titleRef} className="ow-title">{first.title}</p>
        </div>
        <button
          type="button"
          className="ow-play"
          onClick={() => control.current?.toggle()}
          aria-label={play === "playing" ? "Pause the opening" : "Play the opening"}
        >
          <PlayIcon state={play} />
        </button>

        {/* the cause, at key moments, over the shaded bottom edge */}
        <p ref={capRef} className="ow-cap" aria-hidden>{first.caption}</p>

        {/* the ruler as the route line: a tick per moment, taller at the key ones, the needle a station */}
        <div className="ow-ruler" aria-hidden>
          <span className="ow-line" />
          {plan.slots.map((s, k) => (
            <span key={s.id} className={`ow-tick${s.key ? " is-key" : ""}`} style={{ left: `${(k / last) * 100}%` }} />
          ))}
          <span ref={needleRef} className="ow-needle-track"><span className="ow-needle" /></span>
          <span className="ow-ends"><span>{first.label}</span><span>Now</span></span>
        </div>
      </div>

      <figcaption className="ow-label">
        <span className="sr-only">A short sequence from the Big Bang to today. Use Read as text for every moment in order.</span>
        {aside}
      </figcaption>
    </figure>
  );
}

/** Pause bars while playing, a triangle while paused. */
function PlayIcon({ state }: { state: PlayState }) {
  const s = { fill: "none", stroke: "currentColor", strokeWidth: 1.6, strokeLinecap: "round", strokeLinejoin: "round" } as const;
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden>
      {state === "playing" ? <path d="M5.5 3.5v9M10.5 3.5v9" {...s} /> : <path d="M5 3.2v9.6L12.8 8Z" {...s} fill="currentColor" />}
    </svg>
  );
}

function ready(el: HTMLImageElement | null | undefined): el is HTMLImageElement {
  return !!el && el.complete && el.naturalWidth > 0;
}
