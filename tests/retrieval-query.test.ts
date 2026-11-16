import { describe, expect, it } from "vitest";
import { retrievalQuery } from "@/lib/director/turn";
import type { TurnRequest } from "@/lib/contracts";

const turn = (over: Partial<TurnRequest>): TurnRequest => ({ message: null, workspace: { blocks: [] }, ...over }) as unknown as TurnRequest;

describe("retrievalQuery", () => {
  it("searches on the question", () => {
    expect(retrievalQuery(turn({ message: "Why did Rome beat Carthage?" }))).toBe("Why did Rome beat Carthage?");
  });

  it("adds a pasted reading's opening, since a request to explain it names no subject", () => {
    const paste = "In 218 BC Hannibal left Iberia with an army that included war elephants, crossed the Pyrenees and then the Alps.";
    const q = retrievalQuery(turn({ message: "Help me understand what I'm reading.", source_text: paste }))!;
    expect(q.startsWith("Help me understand what I'm reading.")).toBe(true);
    expect(q).toContain("Hannibal left Iberia");
    expect(q.length).toBeLessThanOrEqual(500);
  });

  it("keeps a long paste and a long question within the 500-character limit, the paste's start included", () => {
    const q = retrievalQuery(turn({ message: "x".repeat(600), source_text: "Cannae " + "y".repeat(900) }))!;
    expect(q.length).toBe(500);
    expect(q).toContain("Cannae");
  });

  it("does not search for quizzes", () => {
    expect(retrievalQuery(turn({ message: "Quiz me on what we covered." }))).toBeNull();
  });
});
