import { describe, expect, it } from "vitest";
import { ObjectStreamParser } from "@/lib/director/stream-parser";
import { buildContext, nextBlockId } from "@/lib/director/context";
import { readFixture } from "@/lib/fixtures";

function feed(chunks: string[]) {
  const p = new ObjectStreamParser();
  return chunks.flatMap((c) => p.push(c));
}

describe("ObjectStreamParser", () => {
  it("extracts one object per line", () => {
    expect(feed(['{"t":"say","text":"hi"}\n{"t":"done"}\n'])).toEqual(['{"t":"say","text":"hi"}', '{"t":"done"}']);
  });

  it("handles pretty-printed objects", () => {
    const out = feed(['{\n  "t": "op",\n  "op": {\n    "op": "remove",\n    "id": "b2"\n  }\n}\n']);
    expect(out).toHaveLength(1);
    expect(JSON.parse(out[0])).toEqual({ t: "op", op: { op: "remove", id: "b2" } });
  });

  it("handles objects split across arbitrary chunk boundaries", () => {
    const text = readFixture("punic-wars.ndjson").join("\n");
    const expected = feed([text]);
    for (const size of [1, 3, 7, 64, 500]) {
      const chunks: string[] = [];
      for (let i = 0; i < text.length; i += size) chunks.push(text.slice(i, i + size));
      expect(feed(chunks)).toEqual(expected);
    }
    expect(expected).toHaveLength(9);
  });

  it("ignores braces and escaped quotes inside strings", () => {
    const obj = '{"t":"say","text":"a {b} \\"quoted }\\" \\\\ end"}';
    expect(feed([obj.slice(0, 20), obj.slice(20)])).toEqual([obj]);
    expect(JSON.parse(feed([obj])[0]).text).toBe('a {b} "quoted }" \\ end');
  });

  it("ignores code fences and prose outside objects", () => {
    const out = feed(["Sure, here you go:\n```json\n", '{"t":"say","text":"x"}\n', "```\n", '```\n{"t":"done"}```']);
    expect(out).toEqual(['{"t":"say","text":"x"}', '{"t":"done"}']);
  });

  it("never throws on garbage", () => {
    expect(() => feed(["}}}{{{\"\\", "\u0000", "]]"])).not.toThrow();
  });
});

describe("buildContext", () => {
  it("computes next_block_id and lists only id/type/title", () => {
    const ctx = buildContext({
      message: "Go deeper",
      event: null,
      workspace: {
        level: "new",
        blocks: [{ id: "b1", type: "article", title: "A" }, { id: "b7", type: "quiz", title: "Q" }],
        mastery: [{ ref: "b2:n1", strength: 0.9 }, { ref: "b2:n4", strength: 0.1 }],
      },
    });
    expect(ctx).toContain("next_block_id: b8");
    expect(ctx).toContain("- b7 | quiz | Q");
    expect(ctx).toContain('learner message: "Go deeper"');
    expect(ctx.indexOf("b2:n4")).toBeLessThan(ctx.indexOf("b2:n1"));
    expect(nextBlockId([])).toBe(1);
  });
});
