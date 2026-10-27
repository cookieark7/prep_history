/**
 * End to end, the demo script from docs/PROTOTYPE_PLAN.md section 1, with the mock Director so it
 * costs nothing and gives the same lesson every time:
 *
 *   docker compose up -d db && npm run build && npx tsx scripts/e2e.ts
 *   npx tsx scripts/e2e.ts --shots docs/screens/prototype     # also save screenshots (3 widths × 2 themes)
 *
 * Starts its own server on :3300 (MOCK_LLM=1), drives the system Chrome as two devices, reads the
 * sign-in links from the server log, and checks each step. Exits 1 if any step fails.
 */
import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { chromium, type Browser, type BrowserContext, type Page } from "playwright-core";

const PORT = 3300;
const BASE = `http://localhost:${PORT}`;
const EMAIL = `e2e-${Date.now()}@example.com`;
const shotsDir = (() => { const i = process.argv.indexOf("--shots"); return i > 0 ? process.argv[i + 1] : null; })();
const QUESTION = "Why did Rome beat Carthage?";

const links: string[] = [];
const failures: string[] = [];
let n = 0;

async function step(name: string, fn: () => Promise<string | void>) {
  n++;
  try {
    const note = await fn();
    console.log(`✓ ${n}. ${name}${note ? ` — ${note}` : ""}`);
  } catch (e) {
    failures.push(name);
    console.log(`✗ ${n}. ${name} — ${(e as Error).message.split("\n")[0]}`);
  }
}
const expect = (ok: unknown, msg: string) => { if (!ok) throw new Error(msg); };

async function session(page: Page) {
  return page.evaluate(() => fetch("/api/auth/get-session").then((r) => r.json()).then((d) => ({ email: d?.user?.email as string | undefined, guest: !!d?.user?.isAnonymous })));
}

/** Ask for a sign-in link for EMAIL and open it (the server prints it: no email provider in tests). */
async function signIn(page: Page, next = "/start") {
  const before = links.length;
  const status = await page.evaluate(([email, callbackURL]) =>
    fetch("/api/auth/sign-in/magic-link", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email, callbackURL }) }).then((r) => r.status), [EMAIL, next]);
  expect(status === 200, `sign-in link request returned ${status}`);
  for (let i = 0; i < 50 && links.length === before; i++) await page.waitForTimeout(200);
  expect(links.length > before, "no sign-in link in the server log");
  await page.goto(links.at(-1)!, { waitUntil: "networkidle" });
}

async function waitForServer() {
  for (let i = 0; i < 120; i++) {
    try { if ((await fetch(`${BASE}/start`)).ok) return; } catch { /* not up yet */ }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error("server did not start (did you run npm run build?)");
}

async function main() {
  const server = spawn("npx", ["next", "start", "-p", String(PORT)], {
    env: { ...process.env, MOCK_LLM: "1", BETTER_AUTH_URL: BASE, AUTH_LOG_LINKS: "1" },
    stdio: ["ignore", "pipe", "pipe"],
  });
  const onOut = (d: Buffer) => { for (const m of String(d).matchAll(/\[auth\] sign-in link for \S+ [^:]*: (\S+)/g)) links.push(m[1]); };
  server.stdout.on("data", onOut);
  server.stderr.on("data", onOut);
  let browser: Browser | null = null;
  try {
    await waitForServer();
    browser = await chromium.launch({ channel: "chrome", headless: true });

    // ------------------------------------------------------------ device A: a laptop
    const a = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: "light", reducedMotion: "reduce" });
    const pa = await a.newPage();

    await step("a first visit starts a guest session", async () => {
      await pa.goto(`${BASE}/start`, { waitUntil: "networkidle" });
      await pa.waitForTimeout(1000);
      const s = await session(pa);
      expect(s.guest, "no guest session");
    });

    await step("asking a question streams a lesson", async () => {
      await pa.getByLabel("Topic or question").fill(QUESTION);
      await pa.getByRole("button", { name: "Start lesson" }).click();
      await pa.waitForURL("**/study");
      await pa.locator('[data-block="b4"]').first().waitFor({ timeout: 30_000 });
      await pa.getByRole("button", { name: "Stop (Esc)" }).first().waitFor({ state: "detached", timeout: 30_000 }).catch(() => {});
      return `${await pa.locator("[data-block]").count()} blocks`;
    });

    await step("the lesson is saved on the server", async () => {
      for (let i = 0; i < 20; i++) {
        const list = await pa.evaluate(() => fetch("/api/lessons").then((r) => r.json()));
        if (list.lessons?.some((l: { topic: string }) => l.topic.includes("Carthage"))) return "found in /api/lessons";
        await pa.waitForTimeout(500);
      }
      throw new Error("lesson not saved");
    });

    let due = 0;
    await step("/start offers the lesson's cards for review", async () => {
      await pa.goto(`${BASE}/start`, { waitUntil: "networkidle" });
      const panel = pa.getByText(/\d+ cards? to review/).first();
      await panel.waitFor({ timeout: 10_000 });
      due = Number((await panel.innerText()).match(/(\d+) cards? to review/)?.[1] ?? 0);
      expect(due > 0, "no cards to review");
      if (shotsDir) await pa.screenshot({ path: path.join(shotsDir, "flow-1440-light-start-review-banner.png") });
      return `${due} to review`;
    });

    await step("signing in by email keeps the guest's lesson and cards", async () => {
      await signIn(pa);
      const s = await session(pa);
      expect(s.email === EMAIL && !s.guest, `signed in as ${s.email}`);
      const list = await pa.evaluate(() => fetch("/api/lessons").then((r) => r.json()));
      expect(list.lessons?.length >= 1, "lessons did not move");
    });

    await step("reviewing every card, with the answer shown before rating", async () => {
      await pa.goto(`${BASE}/review`, { waitUntil: "networkidle" });
      let reviewed = 0;
      for (let i = 0; i < 40; i++) {
        if (await pa.getByRole("heading", { name: "Done for now" }).isVisible().catch(() => false)) break;
        const show = pa.getByRole("button", { name: "Show answer" });
        await show.waitFor({ timeout: 10_000 });
        if (shotsDir && i === 0) await pa.screenshot({ path: path.join(shotsDir, "flow-1440-light-review-question.png") });
        await show.click();
        if (shotsDir && i === 0) await pa.screenshot({ path: path.join(shotsDir, "flow-1440-light-review-answer.png") });
        await pa.getByRole("button", { name: /^Good/ }).click();
        reviewed++;
        await pa.waitForTimeout(250);
      }
      await pa.getByRole("heading", { name: "Done for now" }).waitFor({ timeout: 10_000 });
      expect(reviewed === due, `reviewed ${reviewed}, expected ${due}`);
      return `${reviewed} cards`;
    });

    await step("/stats counts today's reviews", async () => {
      await pa.goto(`${BASE}/stats`, { waitUntil: "networkidle" });
      await pa.getByText("Reviewed today").waitFor();
      const text = await pa.locator("main").innerText();
      const today = Number(text.match(/(\d+)\s*\n\s*Reviewed today/)?.[1] ?? -1);
      expect(today === due, `reviewed today shows ${today}`);
      return `${today} reviewed today`;
    });

    const signedIn = await a.storageState();

    // ------------------------------------------------------------ device B: a phone
    const b = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, colorScheme: "dark", reducedMotion: "reduce" });
    const pb = await b.newPage();
    await step("on a phone, the same email reaches the same lesson", async () => {
      await pb.goto(`${BASE}/start`, { waitUntil: "networkidle" });
      await signIn(pb);
      await pb.getByRole("heading", { name: "Recent lessons" }).waitFor({ timeout: 10_000 }).catch(() => {});
      await pb.getByText(/Carthage/).last().waitFor({ timeout: 10_000 }).catch(() => {});
      const text = await pb.locator("main").innerText();
      expect(/Recent lessons[\s\S]*Carthage/i.test(text), "lesson not in Recent lessons");
      await pb.getByText(/Why Rome beat Carthage|Why did Rome beat Carthage/).last().click();
      await pb.waitForURL("**/study");
      await pb.locator("[data-block]").first().waitFor({ timeout: 10_000 });
      return `${await pb.locator("[data-block]").count()} blocks on the phone`;
    });

    // ------------------------------------------------------------ screenshots: 3 widths × 2 themes
    if (shotsDir) {
      await step("screenshots at 1440, 768 and 390 px, light and dark", async () => {
        let count = 0;
        for (const [w, h] of [[1440, 900], [768, 1024], [390, 844]] as const) {
          for (const theme of ["light", "dark"] as const) {
            const ctx: BrowserContext = await browser!.newContext({
              storageState: signedIn, viewport: { width: w, height: h }, deviceScaleFactor: w < 500 ? 2 : 1,
              isMobile: w < 500, hasTouch: w < 500, colorScheme: theme, reducedMotion: "reduce",
            });
            const p = await ctx.newPage();
            await p.goto(`${BASE}/start`);
            await p.evaluate((t) => {
              const s = JSON.parse(localStorage.getItem("chronicle:workspace") ?? "null");
              if (s?.state) { s.state.theme = t; localStorage.setItem("chronicle:workspace", JSON.stringify(s)); }
            }, theme);
            for (const page of ["start", "study", "review", "stats"]) {
              await p.goto(`${BASE}/${page}`, { waitUntil: "networkidle" });
              await p.waitForTimeout(page === "study" ? 1500 : 800);
              await p.screenshot({ path: path.join(shotsDir, `${w}-${theme}-${page}.png`) });
              count++;
            }
            await ctx.close();
          }
        }
        return `${count} screenshots in ${shotsDir}`;
      });
    }
  } finally {
    await browser?.close();
    server.kill("SIGTERM");
  }

  console.log(failures.length ? `\n${failures.length} of ${n} steps failed.` : `\nAll ${n} steps passed (test account ${EMAIL}).`);
  process.exit(failures.length ? 1 : 0);
}

if (shotsDir) mkdirSync(shotsDir, { recursive: true });
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
