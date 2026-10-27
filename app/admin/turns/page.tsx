import { headers } from "next/headers";
import { notFound } from "next/navigation";
import type { StreamLine, TurnRequest } from "@/lib/contracts";
import { currentUser } from "@/lib/auth/server";
import { getDb } from "@/lib/db/client";
import type { Attempt } from "@/lib/llm/router";
import { latestTurns } from "@/lib/turns/log";

// The turn log (docs/PROTOTYPE_PLAN.md, section 10): the latest Director turns with the prompt
// version, who served them, timings and dropped or repaired lines. Open in development; in
// production only for the emails listed in ADMIN_EMAILS.

export const metadata = { title: "Chronicle — Turn log" };
export const dynamic = "force-dynamic";

export default async function TurnLog() {
  const db = getDb();
  if (!db) notFound();
  if (process.env.NODE_ENV === "production") {
    const user = await currentUser(await headers());
    const admins = (process.env.ADMIN_EMAILS ?? "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
    if (!user || user.isAnonymous || !admins.includes(user.email.toLowerCase())) notFound();
  }
  const rows = await latestTurns(db, 100);

  return (
    <main className="min-h-dvh bg-bg px-4 py-8 md:px-8">
      <h1 className="font-heading text-[28px] font-semibold">Turn log</h1>
      <p className="mt-1 text-[13px] text-muted">The latest {rows.length} Director turns, newest first.</p>
      <div className="mt-6 overflow-x-auto rounded-md border border-rule bg-surface">
        <table className="w-full min-w-[900px] text-left text-[13px]">
          <thead className="border-b border-rule text-[12px] text-muted">
            <tr>
              {["When", "Input", "Status", "Served by", "Attempts", "Lines", "Repaired", "Dropped", "First line", "Total", "Prompt"].map((h) => (
                <th key={h} className="px-3 py-2 font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const req = r.request as TurnRequest;
              const lines = r.lines as StreamLine[];
              const attempts = r.attempts as Attempt[];
              const say = lines.find((l) => l.t === "say");
              return (
                <tr key={r.id} className="border-b border-rule align-top last:border-0">
                  <td className="tnum text-[12px] whitespace-nowrap px-3 py-2 text-muted">{r.createdAt.toISOString().slice(5, 19).replace("T", " ")}</td>
                  <td className="max-w-[320px] px-3 py-2">
                    <div className="line-clamp-2">{req.message ?? (req.event ? `event: ${req.event.event}` : "")}</div>
                    {say?.t === "say" && <div className="mt-1 line-clamp-2 text-muted">{say.text}</div>}
                  </td>
                  <td className={`px-3 py-2 ${r.status === "ok" ? "text-ok" : r.status === "running" ? "text-muted" : "text-brick"}`}>{r.status}</td>
                  <td className="px-3 py-2">{r.provider ?? "—"}</td>
                  <td className="px-3 py-2 text-muted">{attempts.map((a) => `${a.provider}:${a.outcome}${a.status ? ` ${a.status}` : ""}`).join(" → ") || "—"}</td>
                  <td className="tnum text-[12px] px-3 py-2">{lines.length}</td>
                  <td className="tnum text-[12px] px-3 py-2">{r.repairedLines}</td>
                  <td className="tnum text-[12px] px-3 py-2">{r.droppedLines}</td>
                  <td className="tnum text-[12px] px-3 py-2">{r.firstLineMs != null ? `${(r.firstLineMs / 1000).toFixed(1)} s` : "—"}</td>
                  <td className="tnum text-[12px] px-3 py-2">{r.totalMs != null ? `${(r.totalMs / 1000).toFixed(1)} s` : "—"}</td>
                  <td className="tnum text-[12px] px-3 py-2 text-muted">{r.promptVersion}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </main>
  );
}
