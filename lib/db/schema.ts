import { sql } from "drizzle-orm";
import type { AuthoredDocument, PrivatePart } from "@/lib/problem-authoring";
import { check, foreignKey, index, type AnyPgColumn, boolean, doublePrecision, integer, jsonb, pgTable, primaryKey, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";
import type { SolutionSubmission } from "@/lib/solution-grading";

export const user = pgTable("user", {
  id: text("id").primaryKey(), name: text("name").notNull(), email: text("email").notNull().unique(),
  emailVerified: boolean("emailVerified").notNull().default(false), image: text("image"),
  termsAcceptedVersion: text("termsAcceptedVersion"), termsAcceptedAt: timestamp("termsAcceptedAt", { withTimezone: true }),
  createdAt: timestamp("createdAt").notNull().defaultNow(), updatedAt: timestamp("updatedAt").notNull().defaultNow(),
});
export const session = pgTable("session", {
  id: text("id").primaryKey(), expiresAt: timestamp("expiresAt").notNull(), token: text("token").notNull().unique(),
  createdAt: timestamp("createdAt").notNull().defaultNow(), updatedAt: timestamp("updatedAt").notNull().defaultNow(),
  ipAddress: text("ipAddress"), userAgent: text("userAgent"), userId: text("userId").notNull().references(() => user.id, { onDelete: "cascade" }),
});
export const account = pgTable("account", {
  id: text("id").primaryKey(), accountId: text("accountId").notNull(), providerId: text("providerId").notNull(),
  userId: text("userId").notNull().references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("accessToken"), refreshToken: text("refreshToken"), idToken: text("idToken"),
  accessTokenExpiresAt: timestamp("accessTokenExpiresAt"), refreshTokenExpiresAt: timestamp("refreshTokenExpiresAt"), scope: text("scope"), password: text("password"),
  createdAt: timestamp("createdAt").notNull().defaultNow(), updatedAt: timestamp("updatedAt").notNull().defaultNow(),
});
export const verification = pgTable("verification", {
  id: text("id").primaryKey(), identifier: text("identifier").notNull(), value: text("value").notNull(),
  expiresAt: timestamp("expiresAt").notNull(), createdAt: timestamp("createdAt").defaultNow(), updatedAt: timestamp("updatedAt").defaultNow(),
});
export const solutionAttempts = pgTable("solution_attempt", {
  id: uuid("id").primaryKey(), userId: text("userId").notNull(), problemId: text("problemId").notNull(),
  problemVersion: text("problemVersion").notNull(), partId: text("partId").notNull(), payload: jsonb("payload").$type<SolutionSubmission>().notNull(),
  status: text("status").$type<"awaiting-reference">().notNull(), idempotencyKey: uuid("idempotencyKey").notNull(), createdAt: timestamp("createdAt", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [unique("solution_attempt_userId_idempotencyKey_key").on(table.userId, table.idempotencyKey)]);
export const solutionEvidence = pgTable("solution_evidence", {
  id: uuid("id").primaryKey(), userId: text("userId").notNull(), pathname: text("pathname").notNull(), filename: text("filename").notNull(),
  mediaType: text("mediaType").notNull(), bytes: integer("bytes").notNull(), sha256: text("sha256").notNull(), createdAt: timestamp("createdAt", { withTimezone: true }).notNull().defaultNow(),
});

export const practiceAttempts = pgTable("practice_attempt", {
  id: uuid("id").primaryKey(), userId: text("userId").notNull(), problemId: text("problemId").notNull(),
  idempotencyKey: uuid("idempotencyKey").notNull(), answer: doublePrecision("answer").notNull(), working: text("working").notNull().default(""),
  correct: boolean("correct").notNull(), createdAt: timestamp("createdAt", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [unique("practice_attempt_userId_idempotencyKey_key").on(table.userId, table.idempotencyKey)]);

export const contests = pgTable("contest", {
  id: text("id").primaryKey(), name: text("name").notNull(), description: text("description").notNull(),
  startsAt: timestamp("startsAt", { withTimezone: true }).notNull(), durationMinutes: integer("durationMinutes").notNull(),
  published: boolean("published").notNull().default(false), rated: boolean("rated").notNull().default(false),
  registrationOpen: boolean("registrationOpen").notNull().default(false), problemIds: jsonb("problemIds").$type<string[]>().notNull().default([]),
  creators: jsonb("creators").$type<string[]>().notNull().default([]), createdAt: timestamp("createdAt", { withTimezone: true }).notNull().defaultNow(),
});

export const contestRegistrations = pgTable("contest_registration", {
  userId: text("userId").notNull(), contestId: text("contestId").notNull(), createdAt: timestamp("createdAt", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [primaryKey({ columns: [table.userId, table.contestId] })]);

export const contestRatings = pgTable("contest_rating", {
  id: uuid("id").primaryKey(), userId: text("userId").notNull(), contestId: text("contestId").notNull(), publicHandle: text("publicHandle"),
  rating: integer("rating").notNull(), change: integer("change").notNull(), createdAt: timestamp("createdAt", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [unique("contest_rating_userId_contestId_key").on(table.userId, table.contestId)]);

export const archiveProgress = pgTable("archive_progress", {
  userId: text("userId").notNull(), taskId: text("taskId").notNull(), reviewed: boolean("reviewed").notNull().default(false),
  notes: text("notes").notNull().default(""), answer: text("answer").notNull().default(""), updatedAt: timestamp("updatedAt", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [primaryKey({ columns: [table.userId, table.taskId] })]);

// Authored content is isolated from the static/archive contracts above.
export const authoredProblems = pgTable("authored_problem", {
  id: uuid("id").primaryKey(), slug: text("slug").notNull().unique(),
  ownerId: text("owner_id").notNull().references(() => user.id, { onDelete: "restrict" }),
  state: text("state").$type<"draft" | "published" | "archived">().notNull().default("draft"),
  publishedRevisionId: uuid("published_revision_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("authored_problem_owner_idx").on(t.ownerId),
  check("authored_problem_state_check", sql`${t.state} in ('draft','published','archived')`),
  check("authored_problem_slug_check", sql`${t.slug} ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(${t.slug}) <= 120`),
  check("authored_problem_publication_check", sql`${t.state} <> 'published' or ${t.publishedRevisionId} is not null`),
  foreignKey({ name: "authored_problem_revision_fk", columns: [t.id, t.publishedRevisionId], foreignColumns: [authoredRevisions.problemId, authoredRevisions.id] }),
]);

export const authoredDrafts = pgTable("authored_draft", {
  problemId: uuid("problem_id").primaryKey().references((): AnyPgColumn => authoredProblems.id, { onDelete: "cascade" }),
  version: integer("version").notNull().default(1),
  content: jsonb("content").$type<AuthoredDocument>().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [check("authored_draft_version_check", sql`${t.version} > 0`)]);

export const authoredRevisions = pgTable("authored_revision", {
  id: uuid("id").primaryKey(),
  problemId: uuid("problem_id").notNull().references((): AnyPgColumn => authoredProblems.id, { onDelete: "restrict" }),
  number: integer("number").notNull(), schemaVersion: integer("schema_version").notNull().default(1),
  content: jsonb("content").$type<AuthoredDocument>().notNull(),
  publishedAt: timestamp("published_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [unique("authored_revision_number_key").on(t.problemId, t.number), unique("authored_revision_problem_id_key").on(t.problemId, t.id),
  check("authored_revision_version_check", sql`${t.number} > 0 and ${t.schemaVersion} = 1`)]);

export const authoredDraftPrivateParts = pgTable("authored_draft_private_part", {
  problemId: uuid("problem_id").notNull().references(() => authoredDrafts.problemId, { onDelete: "cascade" }),
  partId: uuid("part_id").notNull(), data: jsonb("data").$type<PrivatePart>().notNull(),
}, (t) => [primaryKey({ columns: [t.problemId, t.partId] }), check("authored_draft_private_identity_check", sql`(jsonb_typeof(${t.data}) = 'object' and jsonb_typeof(${t.data}->'partId') = 'string' and ${t.data}->>'partId' = ${t.partId}::text) is true`)]);

// Stable revision/part identities support future attempt foreign keys without JSON joins.
export const authoredRevisionParts = pgTable("authored_revision_part", {
  revisionId: uuid("revision_id").notNull().references(() => authoredRevisions.id, { onDelete: "restrict" }),
  partId: uuid("part_id").notNull(), answerMode: text("answer_mode").$type<"numeric" | "expression" | "manual">().notNull(),
}, (t) => [primaryKey({ columns: [t.revisionId, t.partId] }), unique("authored_revision_part_mode_key").on(t.revisionId,t.partId,t.answerMode),
  check("authored_revision_part_mode_check", sql`${t.answerMode} in ('numeric','expression','manual')`)]);

export const authoredRevisionPrivateParts = pgTable("authored_revision_private_part", {
  revisionId: uuid("revision_id").notNull(), partId: uuid("part_id").notNull(),
  answerMode: text("answer_mode").$type<"numeric" | "expression" | "manual">().notNull(), data: jsonb("data").$type<PrivatePart>().notNull(),
}, (t) => [primaryKey({ columns: [t.revisionId,t.partId] }),
  foreignKey({ name:"authored_revision_private_part_fk", columns:[t.revisionId,t.partId,t.answerMode], foreignColumns:[authoredRevisionParts.revisionId,authoredRevisionParts.partId,authoredRevisionParts.answerMode] }),
  check("authored_revision_private_identity_check", sql`(jsonb_typeof(${t.data}) = 'object' and jsonb_typeof(${t.data}->'partId') = 'string' and ${t.data}->>'partId' = ${t.partId}::text and ${t.data} ? 'key' and jsonb_typeof(${t.data}->'key') = 'object' and ${t.data}->'key' ? 'kind' and ${t.data}->'key'->>'kind' = ${t.answerMode}) is true`)]);
