import { readFileSync } from "node:fs";
import path from "node:path";

const DIR = path.join(process.cwd(), "lib", "fixtures");

/** Topic fixtures: a full lesson each. Keyword matched against the learner's message. */
export const TOPIC_FIXTURES: { file: string; keywords: string[] }[] = [
  { file: "punic-wars.ndjson", keywords: ["carthage", "punic", "hannibal", "cannae", "scipio"] },
  { file: "fall-of-rome.ndjson", keywords: ["fall of rome", "western roman", "roman empire", "odoacer", "476"] },
  { file: "mughal-succession.ndjson", keywords: ["mughal", "akbar", "aurangzeb", "babur", "jahangir", "shah jahan"] },
];

export function readFixture(file: string): string[] {
  return readFileSync(path.join(DIR, file), "utf8")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
}
