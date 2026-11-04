"use client";

import { useEffect, useSyncExternalStore } from "react";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { Goal, Level } from "@/lib/contracts";
import { stationById, stationsOf, type PartId } from "@/content/syllabus";

// Where the student is on the syllabus route, kept in this browser: the open part, the station
// on the board, the stations they have started a lesson from, and which station each of those
// lessons came from. Only lessons begun from a station count; a free question is not matched to one.
// Also the goal the next lesson starts with, and the parts of a station's series read so far: a
// part counts as covered once its lesson has been read to the end (decided 31 Oct 2026).

interface RouteState {
  part: PartId;
  station: string;
  started: Record<string, number>;
  /** lesson id -> the station it was started from */
  lessons: Record<string, string>;
  /** the switch on the app home: what the next lesson is for, remembered on this device */
  goal: Goal;
  /** lesson id -> the series part it was started for */
  parts: Record<string, string>;
  /** series parts read to the end, keyed "station/part" */
  read: Record<string, true>;
  setPart: (part: PartId) => void;
  setStation: (id: string) => void;
  setGoal: (goal: Goal) => void;
  markStarted: (id: string, lessonId: string, part?: string) => void;
  markRead: (lessonId: string) => void;
}

export const useRoute = create<RouteState>()(
  persist(
    (set) => ({
      part: "ancient",
      station: "harappan",
      started: {},
      lessons: {},
      goal: "exam",
      parts: {},
      read: {},
      setPart: (part) => set((s) => (s.part === part ? s : { part, station: stationById(s.station)?.part === part ? s.station : stationsOf(part)[0].id })),
      setStation: (id) => set(() => ({ station: id, part: stationById(id)?.part ?? "ancient" })),
      setGoal: (goal) => set(() => ({ goal })),
      markStarted: (id, lessonId, part) => set((s) => ({
        started: { ...s.started, [id]: (s.started[id] ?? 0) + 1 },
        lessons: { ...s.lessons, [lessonId]: id },
        parts: part ? { ...s.parts, [lessonId]: part } : s.parts,
      })),
      markRead: (lessonId) => set((s) => {
        const station = s.lessons[lessonId], part = s.parts[lessonId];
        const key = `${station}/${part}`;
        return station && part && !s.read[key] ? { read: { ...s.read, [key]: true } } : s;
      }),
    }),
    {
      name: "chronicle:route", storage: createJSONStorage(() => localStorage), skipHydration: true, version: 3,
      migrate: (old) => ({ lessons: {}, goal: "exam", parts: {}, read: {}, ...(old as object) }) as RouteState,
    },
  ),
);

/**
 * The level a lesson starts at, worked out rather than asked (decided 31 Oct 2026): the first
 * lesson from a station is for someone new to it, a later one is revision; a free question gets
 * the middle level.
 */
export function levelFor(station: string | undefined, started: Record<string, number>): Level {
  return !station ? "some" : started[station] ? "advanced" : "new";
}

/** True once the saved route has loaded in this browser; the route renders after that. */
export function useRouteHydrated() {
  const hydrated = useSyncExternalStore(
    (cb) => useRoute.persist.onFinishHydration(cb),
    () => useRoute.persist.hasHydrated(),
    () => false,
  );
  useEffect(() => {
    if (!useRoute.persist.hasHydrated()) void useRoute.persist.rehydrate();
  }, []);
  return hydrated;
}
