import { describe, expect, it } from "vitest";
import { preprocessMarkdown } from "@/lib/entities";

describe("preprocessMarkdown", () => {
  it("links the four entity types", () => {
    expect(preprocessMarkdown("[[Akbar|person]] at [[Fatehpur Sikri|place]]")).toBe("[Akbar](entity:person) at [Fatehpur Sikri](entity:place)");
  });
  it("reads any other type the model invents as a term, never raw markup", () => {
    expect(preprocessMarkdown("the [[Maratha Empire|entity]] and the [[Lodi|Dynasty]]")).toBe("the [Maratha Empire](entity:term) and the [Lodi](entity:term)");
  });
  it("writes eras as BCE and CE", () => {
    expect(preprocessMarkdown("in 264 BC, and later AD 476")).toBe("in 264 BCE, and later 476 CE");
    expect(preprocessMarkdown("from 218 BCE")).toBe("from 218 BCE");
  });
});
