"use client";

import { useEffect, useSyncExternalStore } from "react";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { stationById, stationsOf, type PartId } from "@/content/syllabus";

// Where the student is on the syllabus route, kept in this browser: the open part, the station
// on the board, the stations they have started a lesson from, and which station each of those
// lessons came from. Only lessons begun from a station count; a free question is not matched to one.

interface RouteState {
  part: PartId;
  station: string;
  started: Record<string, number>;
  /** lesson id -> the station it was started from */
  lessons: Record<string, string>;
  setPart: (part: PartId) => void;
  setStation: (id: string) => void;
  markStarted: (id: string, lessonId: string) => void;
}

export const useRoute = create<RouteState>()(
  persist(
    (set) => ({
      part: "ancient",
      station: "harappan",
      started: {},
      lessons: {},
      setPart: (part) => set((s) => (s.part === part ? s : { part, station: stationById(s.station)?.part === part ? s.station : stationsOf(part)[0].id })),
      setStation: (id) => set(() => ({ station: id, part: stationById(id)?.part ?? "ancient" })),
      markStarted: (id, lessonId) => set((s) => ({ started: { ...s.started, [id]: (s.started[id] ?? 0) + 1 }, lessons: { ...s.lessons, [lessonId]: id } })),
    }),
    { name: "chronicle:route", storage: createJSONStorage(() => localStorage), skipHydration: true, version: 2, migrate: (old) => ({ lessons: {}, ...(old as object) }) as RouteState },
  ),
);

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
