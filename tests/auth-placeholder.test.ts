import { describe, expect, it } from "vitest";
import { createPlaceholderAuth, PLACEHOLDER_KEY } from "@/lib/auth/placeholder";

function memoryStorage() {
  const m = new Map<string, string>();
  return {
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => void m.set(k, v),
    removeItem: (k: string) => void m.delete(k),
    raw: m,
  };
}

describe("placeholder auth (L3)", () => {
  it("signs in with Google, persists, notifies and signs out", async () => {
    const store = memoryStorage();
    const auth = createPlaceholderAuth({ storage: () => store, delayMs: 0 });
    const seen: (string | null)[] = [];
    const off = auth.subscribe((s) => seen.push(s?.provider ?? null));
    expect(auth.getSession()).toBeNull();

    const s = await auth.signInWithGoogle({ weeklyNote: true });
    expect(s.provider).toBe("google");
    expect(s.prefs.weeklyNote).toBe(true);
    expect(auth.getSession()).toEqual(s);
    expect(store.raw.has(PLACEHOLDER_KEY)).toBe(true);
    // a fresh client (a new page) reads the same session back
    expect(createPlaceholderAuth({ storage: () => store, delayMs: 0 }).getSession()).toEqual(s);

    await auth.signOut();
    expect(auth.getSession()).toBeNull();
    expect(seen).toEqual(["google", null]);
    off();
  });

  it("signs in with email straight away and keeps the weekly note off by default", async () => {
    const auth = createPlaceholderAuth({ storage: () => memoryStorage(), delayMs: 0 });
    const s = await auth.signInWithEmail("  ada@example.org ");
    expect(s?.user.email).toBe("ada@example.org");
    expect(s?.prefs.weeklyNote).toBe(false);
    await expect(auth.signInWithEmail("not an email")).rejects.toThrow();
  });

  it("treats blocked or corrupt storage as signed out", () => {
    const throwing = { getItem: () => { throw new Error("blocked"); }, setItem() {}, removeItem() {} };
    expect(createPlaceholderAuth({ storage: () => throwing, delayMs: 0 }).getSession()).toBeNull();
    const corrupt = memoryStorage();
    corrupt.setItem(PLACEHOLDER_KEY, "{not json");
    expect(createPlaceholderAuth({ storage: () => corrupt, delayMs: 0 }).getSession()).toBeNull();
  });
});

describe("placeholder guest", () => {
  it("starts a guest session without an email", async () => {
    const auth = createPlaceholderAuth({ storage: () => memoryStorage(), delayMs: 0 });
    const s = await auth.continueAsGuest();
    expect(s).toMatchObject({ provider: "guest", user: { email: null } });
    expect(auth.getSession()?.provider).toBe("guest");
  });
});
