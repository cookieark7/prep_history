import { describe, expect, it } from "vitest";
import { validateLine } from "@/lib/contracts";
import { DIRECTOR_MODULES, DIRECTOR_SYSTEM_PROMPT, PROMPT_VERSION, fnv1a } from "@/lib/prompts/director";
import { EXAMPLE_LINES } from "@/lib/prompts/director/example";

describe("Director prompt", () => {
  it("assembles the modules in order, with the worked example last", () => {
    const order = ["You are the Director", "OUTPUT PROTOCOL", "BLOCK TYPES", "WHAT YOU RECEIVE", "DECISION RULES", "HONESTY BASICS", "SOURCES\nSome turns", "\nLEVEL\n", "STYLE", "EXAMPLE ("];
    const at = order.map((s) => DIRECTOR_SYSTEM_PROMPT.indexOf(s));
    expect(at.every((i) => i >= 0)).toBe(true);
    expect([...at].sort((a, b) => a - b)).toEqual(at);
    expect(DIRECTOR_SYSTEM_PROMPT.endsWith('{"t":"done"}')).toBe(true);
    expect(Object.keys(DIRECTOR_MODULES).at(-1)).toBe("EXAMPLE");
  });

  it("has a worked example the client would accept, line by line", () => {
    for (const line of EXAMPLE_LINES) expect(validateLine(line)).toMatchObject({ ok: true });
    expect(JSON.parse(EXAMPLE_LINES[0]).t).toBe("say");
    expect(JSON.parse(EXAMPLE_LINES.at(-1)!).t).toBe("done");
  });

  it("versions the prompt by its text", () => {
    expect(PROMPT_VERSION).toMatch(/^director-[0-9a-f]{8}$/);
    expect(PROMPT_VERSION).toBe(`director-${fnv1a(DIRECTOR_SYSTEM_PROMPT)}`);
    expect(fnv1a(DIRECTOR_SYSTEM_PROMPT + " ")).not.toBe(fnv1a(DIRECTOR_SYSTEM_PROMPT));
    expect(fnv1a("")).toBe("811c9dc5");
  });
});
