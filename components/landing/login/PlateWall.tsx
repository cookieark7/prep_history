"use client";

import { Plate } from "@/components/landing/Plate";

// The login card's backdrop (prompt section 5): four plates crossfading slowly with a gentle
// push-in, under a flat paper wash. No dark scrim, no blur. CSS-only (see opening.css).

const WALL = ["B18", "B22", "B26", "B27"];
const EACH_MS = 6000;
const PUSH_TO = 1.05;
const WASH = 0.35;

export function PlateWall() {
  const cycle = EACH_MS * WALL.length;
  return (
    <div className="plate-wall" aria-hidden style={{ ["--wall-cycle" as string]: `${cycle}ms`, ["--wall-push" as string]: PUSH_TO }}>
      {WALL.map((id, i) => (
        <Plate key={id} id={id} className="plate-wall-plate" style={{ animationDelay: `${i * EACH_MS - EACH_MS * 0.2}ms` }} />
      ))}
      <div className="absolute inset-0" style={{ background: `rgba(241, 243, 239, ${WASH})` }} />
    </div>
  );
}
