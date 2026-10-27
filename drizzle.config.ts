import { defineConfig } from "drizzle-kit";

// npx drizzle-kit generate   writes SQL migrations to drizzle/ from lib/db/schema.ts
// The app applies them itself at startup (instrumentation.ts → migrateDb).
export default defineConfig({
  dialect: "postgresql",
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
  dbCredentials: { url: process.env.DATABASE_URL ?? "postgres://chronicle:chronicle@localhost:5433/chronicle" },
});
