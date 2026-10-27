import { and, eq, inArray } from "drizzle-orm";
import type { Db } from "@/lib/db/client";
import { schema } from "@/lib/db/client";

/**
 * A guest signed in for real (email link or Google): move everything the guest made to the
 * account. Runs before Better Auth deletes the guest user, whose rows would otherwise cascade.
 */
export async function moveGuestData(db: Db, fromUserId: string, toUserId: string): Promise<void> {
  if (fromUserId === toUserId) return;
  await db.transaction(async (tx) => {
    // cards are unique per user and question: the account's copy wins (with its review history)
    const theirs = await tx.select({ hash: schema.cards.frontHash }).from(schema.cards).where(eq(schema.cards.userId, toUserId));
    if (theirs.length) {
      await tx.delete(schema.cards).where(and(eq(schema.cards.userId, fromUserId), inArray(schema.cards.frontHash, theirs.map((t) => t.hash))));
    }
    for (const table of OWNED) {
      await tx.update(table).set({ userId: toUserId }).where(eq(table.userId, fromUserId));
    }
  });
}

/** Every table with rows owned by a user. Add new ones here. */
const OWNED = [schema.lessons, schema.turns, schema.cards, schema.reviewLogs] as const;
