import path from "node:path";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import postgres from "postgres";
import * as schema from "./schema";

// The database is optional: without DATABASE_URL the app works as before (lessons in the
// browser only, no accounts, no turn log). Server-only module.

/** Any Drizzle Postgres database with our schema: postgres-js in the app, PGlite in tests. */
export type Db = PgDatabase<PgQueryResultHKT, typeof schema>;

const g = globalThis as unknown as { __chronicleDb?: Db; __chronicleMigrated?: Promise<void> };

export function getDb(): Db | null {
  const url = process.env.DATABASE_URL;
  if (!url) return null;
  // one pool per process, also across dev hot reloads
  g.__chronicleDb ??= drizzle(postgres(url, { max: 5, onnotice: () => {} }), { schema }) as unknown as Db;
  return g.__chronicleDb;
}

export const MIGRATIONS = path.join(process.cwd(), "drizzle");

/** Apply pending migrations once per process (instrumentation calls this at startup). */
export function migrateDb(): Promise<void> {
  const db = getDb();
  if (!db) return Promise.resolve();
  g.__chronicleMigrated ??= migrate(db as unknown as Parameters<typeof migrate>[0], { migrationsFolder: MIGRATIONS });
  return g.__chronicleMigrated;
}

export { schema };
