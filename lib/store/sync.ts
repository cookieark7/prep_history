"use client";

import { useEffect, useMemo, useState } from "react";
import { ACCOUNTS, getAuthClient } from "@/lib/auth";
import { getLesson as getLocalLesson, listLessons as listLocalLessons, type LessonSummary } from "./lessons";
import { parseSnapshot, snapshot, useWorkspace, type PersistedWorkspace } from "./workspace";

// Lessons on every device (docs/PROTOTYPE_PLAN.md, section 9). With accounts on, the server is
// the source of truth and localStorage stays a fast cache:
// - a guest session starts on first use, and this browser's old lessons are uploaded once;
// - the open lesson is saved 2 s after it changes (not while a turn streams) and when the tab
//   is hidden, with the version it was based on;
// - a newer copy from another device wins: it is loaded, with a short notice.
// Without accounts, everything stays in this browser as before.

const VERSIONS_KEY = "chronicle:server-versions"; // lessonId -> server version this browser has
const IMPORTED_KEY = "chronicle:imported"; // user ids whose browser lessons were uploaded
const SAVE_DELAY_MS = 2000;

const store = () => useWorkspace.getState();
function readMap(key: string): Record<string, number> {
  try { return JSON.parse(localStorage.getItem(key) ?? "{}") ?? {}; } catch { return {}; }
}
function writeMap(key: string, m: Record<string, number>) {
  try { localStorage.setItem(key, JSON.stringify(m)); } catch { /* storage full or blocked */ }
}
const knownVersion = (id: string): number | null => readMap(VERSIONS_KEY)[id] ?? null;
function setKnownVersion(id: string, v: number) {
  const m = readMap(VERSIONS_KEY);
  m[id] = v;
  writeMap(VERSIONS_KEY, m);
}

let started: Promise<void> | null = null;
let timer: ReturnType<typeof setTimeout> | null = null;
let lastSaved = "";
let saving = false;

/** Start syncing (once per page). Safe to call from every app page. */
export function startSync(): Promise<void> {
  if (!ACCOUNTS || typeof window === "undefined") return Promise.resolve();
  started ??= (async () => {
    const session = await getAuthClient().continueAsGuest().catch(() => null);
    if (!session) return;
    await importOnce(session.user.id).catch(() => {});
    await pullCurrent().catch(() => {});
    useWorkspace.subscribe(() => schedule());
    document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") void save(); });
  })();
  return started;
}

/** Upload the lessons this browser kept before accounts, once per user. */
async function importOnce(userId: string) {
  const done = readMap(IMPORTED_KEY);
  if (done[userId]) return;
  const local = listLocalLessons().map((l) => getLocalLesson(l.id)).filter((s): s is PersistedWorkspace => !!s);
  const cur = store();
  if (cur.blocks.length && !local.some((l) => l.lessonId === cur.lessonId)) local.push(snapshot(cur));
  if (local.length) {
    const res = await fetch("/api/lessons/import", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ lessons: local.slice(0, 20) }) });
    if (!res.ok) return;
    for (const l of local) setKnownVersion(l.lessonId, 1);
    // the open lesson is on the server as it is now: no need to save it again
    if (local.some((l) => l.lessonId === cur.lessonId)) lastSaved = JSON.stringify(snapshot(cur));
  }
  done[userId] = Date.now();
  writeMap(IMPORTED_KEY, done);
}

/** If the server has a newer copy of the open lesson (another device), load it. */
async function pullCurrent() {
  const id = store().lessonId;
  const res = await fetch(`/api/lessons/${encodeURIComponent(id)}`);
  if (!res.ok) return;
  const { snapshot: raw, version } = await res.json() as { snapshot: unknown; version: number };
  const mine = knownVersion(id);
  if (mine !== null && version <= mine) return;
  const snap = parseSnapshot(raw);
  if (!snap || store().streaming) return;
  store().loadSnapshot(snap);
  setKnownVersion(id, version);
  lastSaved = JSON.stringify(snapshot(store()));
  if (mine !== null) store().showToast("Updated from your other device");
}

function schedule() {
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => void save(), SAVE_DELAY_MS);
}

/** Save the open lesson if it changed. */
async function save() {
  const st = store();
  if (saving || st.streaming || !st.blocks.length) return;
  const snap = snapshot(st);
  const json = JSON.stringify(snap);
  if (json === lastSaved) return;
  saving = true;
  try {
    const res = await fetch(`/api/lessons/${encodeURIComponent(snap.lessonId)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ snapshot: snap, baseVersion: knownVersion(snap.lessonId) }),
    });
    if (res.ok) {
      setKnownVersion(snap.lessonId, ((await res.json()) as { version: number }).version);
      lastSaved = json;
    } else if (res.status === 409) {
      const server = await res.json() as { version: number; snapshot: unknown };
      const theirs = parseSnapshot(server.snapshot);
      setKnownVersion(snap.lessonId, server.version);
      if (theirs && store().lessonId === snap.lessonId && !store().streaming) {
        store().loadSnapshot(theirs);
        lastSaved = JSON.stringify(snapshot(store()));
        store().showToast("Updated from your other device");
      }
    }
  } catch {
    // offline: the next change or the next visit saves it
  } finally {
    saving = false;
  }
}

/** The lessons to offer under "Continue": from the server with accounts, else from this browser. */
export function useLessonList(hydrated: boolean): LessonSummary[] {
  const local = useMemo(() => (hydrated ? listLocalLessons() : []), [hydrated]);
  const [server, setServer] = useState<LessonSummary[] | null>(null);
  useEffect(() => {
    if (!hydrated || !ACCOUNTS) return;
    let live = true;
    void startSync()
      .then(() => fetch("/api/lessons"))
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { lessons: LessonSummary[] } | null) => { if (live && d) setServer(d.lessons); })
      .catch(() => {});
    return () => { live = false; };
  }, [hydrated]);
  return ACCOUNTS && server ? server : local;
}

/** Open a lesson from the list. Resolves false if it could not be loaded. */
export async function openLesson(id: string): Promise<boolean> {
  if (!ACCOUNTS) {
    const snap = getLocalLesson(id);
    if (snap) store().loadSnapshot(snap);
    return !!snap;
  }
  const res = await fetch(`/api/lessons/${encodeURIComponent(id)}`).catch(() => null);
  if (!res?.ok) {
    const snap = getLocalLesson(id);
    if (snap) store().loadSnapshot(snap);
    return !!snap;
  }
  const { snapshot: raw, version } = await res.json() as { snapshot: unknown; version: number };
  const snap = parseSnapshot(raw);
  if (!snap) return false;
  store().loadSnapshot(snap);
  setKnownVersion(id, version);
  lastSaved = JSON.stringify(snapshot(store()));
  return true;
}
