import { describe, expect, it } from "vitest";
import { normalizeTheme } from "@/lib/store/workspace";

describe("theme (Verdigris: one light, one dark)", () => {
  it("keeps light and dark", () => {
    expect(normalizeTheme("light")).toBe("light");
    expect(normalizeTheme("dark")).toBe("dark");
  });
  it("loads older saves: paper and sepia as light, ink as dark", () => {
    expect(normalizeTheme("paper")).toBe("light");
    expect(normalizeTheme("sepia")).toBe("light");
    expect(normalizeTheme("ink")).toBe("dark");
  });
  it("falls back to light for anything else", () => {
    expect(normalizeTheme(undefined)).toBe("light");
    expect(normalizeTheme("neon")).toBe("light");
  });
});
