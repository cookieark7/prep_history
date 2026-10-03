"use client";

import type { PersistedWorkspace } from "./workspace";
import { blockPeriod } from "@/lib/period";

const KEY = "chronicle:lessons:v1";
const MAX = 8;

export interface LessonSummary {
  id: string;
  topic: string;
  updatedAt: number;
  period: [number, number] | null;
  blockCount: number;
}

interface Archived extends LessonSummary {
  snapshot: PersistedWorkspace;
}

function readAll(): Archived[] {
  try {
    const raw = localStorage.getItem(KEY);
    const list = raw ? (JSON.parse(raw) as Archived[]) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

function writeAll(list: Archived[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX)));
  } catch {
    // storage full or blocked: recent lessons are a convenience, not critical
  }
}

export function lessonPeriod(snap: PersistedWorkspace): [number, number] | null {
  const ranges = snap.blocks.map(blockPeriod).filter((p): p is [number, number] => !!p);
  if (!ranges.length) return null;
  return [Math.min(...ranges.map((r) => r[0])), Math.max(...ranges.map((r) => r[1]))];
}

export function archiveLesson(snap: PersistedWorkspace) {
  if (!snap.blocks.length) return;
  const entry: Archived = {
    id: snap.lessonId,
    topic: snap.topic || snap.blocks[0]?.title || "Untitled lesson",
    updatedAt: Date.now(),
    period: lessonPeriod(snap),
    blockCount: snap.blocks.length,
    snapshot: snap,
  };
  writeAll([entry, ...readAll().filter((l) => l.id !== snap.lessonId)]);
}

export function listLessons(): LessonSummary[] {
  return readAll().map(({ snapshot: _s, ...rest }) => { void _s; return rest; });
}

export function getLesson(id: string): PersistedWorkspace | null {
  return readAll().find((l) => l.id === id)?.snapshot ?? null;
}
