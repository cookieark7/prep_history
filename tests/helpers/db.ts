import { PGlite } from "@electric-sql/pglite";
import { vector } from "@electric-sql/pglite-pgvector";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import * as schema from "@/lib/db/schema";
import type { Db } from "@/lib/db/client";

/** An in-memory Postgres (PGlite, with pgvector) migrated with the app's own migrations. */
export async function testDb(): Promise<{ db: Db; close: () => Promise<void> }> {
  const pg = new PGlite({ extensions: { vector } });
  const db = drizzle(pg, { schema });
  await migrate(db, { migrationsFolder: "drizzle" });
  return { db: db as unknown as Db, close: () => pg.close() };
}

/** Insert a bare user row (lessons and turns reference users). */
export async function addUser(db: Db, id: string, isAnonymous = false) {
  await db.insert(schema.user).values({ id, name: id, email: `${id}@test.invalid`, isAnonymous });
}
