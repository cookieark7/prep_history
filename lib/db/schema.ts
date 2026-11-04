import { sql } from "drizzle-orm";
import { bigserial, boolean, customType, index, integer, jsonb, pgTable, real, text, timestamp, unique, vector } from "drizzle-orm/pg-core";

// One Postgres for everything (docs/PROTOTYPE_PLAN.md, section 8). TypeScript keys are what
// Better Auth and the app use; database columns are snake_case.

const created = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
const updated = () => timestamp("updated_at", { withTimezone: true }).notNull().defaultNow();

// ---------------------------------------------------------------- Better Auth (core + anonymous)

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  /** anonymous plugin: a guest account, created on first use */
  isAnonymous: boolean("is_anonymous").default(false),
  createdAt: created(),
  updatedAt: updated(),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  token: text("token").notNull().unique(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  createdAt: created(),
  updatedAt: updated(),
}, (t) => [index("session_user_idx").on(t.userId)]);

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true }),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { withTimezone: true }),
  scope: text("scope"),
  password: text("password"),
  createdAt: created(),
  updatedAt: updated(),
}, (t) => [index("account_user_idx").on(t.userId)]);

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: created(),
  updatedAt: updated(),
}, (t) => [index("verification_identifier_idx").on(t.identifier)]);

// ---------------------------------------------------------------- lessons and turns

/** A lesson is the client's PersistedWorkspace, stored whole; `version` guards concurrent saves. */
export const lessons = pgTable("lessons", {
  id: text("id").primaryKey(), // the client's lessonId
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  topic: text("topic").notNull().default(""),
  periodFrom: integer("period_from"),
  periodTo: integer("period_to"),
  blockCount: integer("block_count").notNull().default(0),
  snapshot: jsonb("snapshot").notNull(),
  version: integer("version").notNull().default(1),
  createdAt: created(),
  updatedAt: updated(),
}, (t) => [index("lessons_user_updated_idx").on(t.userId, t.updatedAt)]);

/** One row per Director turn: the debugging and evaluation log, and the source of rate limits. */
export const turns = pgTable("turns", {
  id: text("id").primaryKey(), // the client's turn_id, or a server id
  userId: text("user_id").references(() => user.id, { onDelete: "set null" }),
  lessonId: text("lesson_id"),
  request: jsonb("request").notNull(),
  lines: jsonb("lines").notNull().default([]),
  promptVersion: text("prompt_version").notNull(),
  attempts: jsonb("attempts").notNull().default([]),
  /** the provider that served the turn, if any */
  provider: text("provider"),
  /** ok | error | aborted | limited */
  status: text("status").notNull(),
  droppedLines: integer("dropped_lines").notNull().default(0),
  repairedLines: integer("repaired_lines").notNull().default(0),
  /** passages retrieved for this turn: [{ sid, chunkId, heading }] */
  sources: jsonb("sources").notNull().default([]),
  /** citations kept and removed by the server: { cited, removed } */
  citations: jsonb("citations"),
  firstLineMs: integer("first_line_ms"),
  totalMs: integer("total_ms"),
  createdAt: created(),
}, (t) => [index("turns_user_created_idx").on(t.userId, t.createdAt), index("turns_lesson_idx").on(t.lessonId)]);

// ---------------------------------------------------------------- knowledge base (RAG)

/** Embedding size of the corpus model (Cloudflare @cf/baai/bge-m3). Changing it needs a migration. */
export const EMBED_DIM = 1024;

const tsvector = customType<{ data: string }>({ dataType: () => "tsvector" });

/** One source document: a Wikipedia article, a textbook chapter. */
export const sourceDocs = pgTable("source_docs", {
  id: text("id").primaryKey(), // "wiki:Second_Punic_War"
  kind: text("kind").notNull(), // wikipedia | openstax
  title: text("title").notNull(),
  url: text("url").notNull(),
  license: text("license").notNull(),
  attribution: text("attribution").notNull(),
  revision: text("revision"),
  fetchedAt: timestamp("fetched_at", { withTimezone: true }).notNull().defaultNow(),
});

/** A passage of about 250 words, embedded for vector search and indexed for keyword search. */
export const chunks = pgTable("chunks", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  docId: text("doc_id").notNull().references(() => sourceDocs.id, { onDelete: "cascade" }),
  ord: integer("ord").notNull(),
  headingPath: text("heading_path").notNull(),
  text: text("text").notNull(),
  tokens: integer("tokens").notNull(),
  periodFrom: integer("period_from"), // BCE negative, no year 0, as in the app
  periodTo: integer("period_to"),
  contentHash: text("content_hash").notNull(),
  embedding: vector("embedding", { dimensions: EMBED_DIM }),
  embeddingModel: text("embedding_model"),
  tsv: tsvector("tsv").generatedAlwaysAs(sql`to_tsvector('english', heading_path || ' ' || text)`),
}, (t) => [
  unique("chunks_doc_ord").on(t.docId, t.ord),
  index("chunks_embedding_idx").using("hnsw", t.embedding.op("vector_cosine_ops")),
  index("chunks_tsv_idx").using("gin", t.tsv),
  index("chunks_period_idx").on(t.periodFrom, t.periodTo),
]);

// ---------------------------------------------------------------- retention (spaced repetition)

/**
 * A memory card and its FSRS scheduling state (docs/PROTOTYPE_PLAN.md, section 7). Free-recall
 * kinds (why, consequence, …) have a front and a back; auto-checked kinds (mcq, chronology, match)
 * carry the quiz item in `payload`.
 */
export const cards = pgTable("cards", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  lessonId: text("lesson_id"),
  kind: text("kind").notNull(),
  front: text("front").notNull(),
  back: text("back").notNull(),
  payload: jsonb("payload"),
  sourceRef: jsonb("source_ref"),
  cites: jsonb("cites").notNull().default([]),
  /** model | timeline | quiz | graph | note */
  origin: text("origin").notNull(),
  /** the lesson's goal when the card was made: exam | explore (docs/MODES_PLAN.md, 5.3) */
  goal: text("goal").notNull().default("explore"),
  frontHash: text("front_hash").notNull(),
  // FSRS state (ts-fsrs Card)
  due: timestamp("due", { withTimezone: true }).notNull(),
  stability: real("stability").notNull().default(0),
  difficulty: real("difficulty").notNull().default(0),
  elapsedDays: integer("elapsed_days").notNull().default(0),
  scheduledDays: integer("scheduled_days").notNull().default(0),
  learningSteps: integer("learning_steps").notNull().default(0),
  reps: integer("reps").notNull().default(0),
  lapses: integer("lapses").notNull().default(0),
  state: integer("state").notNull().default(0), // 0 new, 1 learning, 2 review, 3 relearning
  lastReview: timestamp("last_review", { withTimezone: true }),
  suspended: boolean("suspended").notNull().default(false),
  createdAt: created(),
}, (t) => [
  unique("cards_user_front").on(t.userId, t.frontHash),
  index("cards_user_due_idx").on(t.userId, t.due),
  index("cards_lesson_idx").on(t.lessonId),
]);

/** Every review, append-only: the raw data for retention stats and for tuning FSRS later. */
export const reviewLogs = pgTable("review_logs", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  cardId: text("card_id").notNull().references(() => cards.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  rating: integer("rating").notNull(), // 1 again, 2 hard, 3 good, 4 easy
  /** the card's state before this review */
  state: integer("state").notNull(),
  correct: boolean("correct"),
  answerText: text("answer_text"),
  durationMs: integer("duration_ms"),
  /** days since the previous review, and the interval this review set */
  elapsedDays: integer("elapsed_days").notNull(),
  scheduledDays: integer("scheduled_days").notNull(),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index("review_logs_user_time_idx").on(t.userId, t.reviewedAt)]);

