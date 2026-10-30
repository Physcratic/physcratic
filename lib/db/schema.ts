import { boolean, doublePrecision, integer, jsonb, pgTable, primaryKey, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";
import type { SolutionSubmission } from "@/lib/solution-grading";

export const user = pgTable("user", {
  id: text("id").primaryKey(), name: text("name").notNull(), email: text("email").notNull().unique(),
  emailVerified: boolean("emailVerified").notNull().default(false), image: text("image"),
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
