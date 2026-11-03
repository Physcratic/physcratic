import arenaRegistry from "@/lib/arena/index.json";
import { sql } from "drizzle-orm";
import type { AuthoredDocument, PrivatePart } from "@/lib/problem-authoring";
import { check, foreignKey, index, type AnyPgColumn, boolean, bigint, date, doublePrecision, integer, jsonb, pgTable, primaryKey, text, timestamp, unique, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import type { ProfileEducationLevel, ProfileTopicId } from "@/lib/community/profile-contracts";
import type { SolutionSubmission } from "@/lib/solution-grading";
import type { ProblemAnswerCheck } from "@/lib/individual-elo";
import type { BadgeId } from "@/lib/community/achievements";

// Mirrors the already-deployed Better Auth shared limiter table.
export const rateLimit = pgTable("rateLimit", {
  id: text("id").primaryKey(),
  key: text("key").notNull().unique(),
  count: integer("count").notNull(),
  lastRequest: bigint("lastRequest", { mode: "number" }).notNull(),
});

export const user = pgTable("user", {
  id: text("id").primaryKey(), name: text("name").notNull(), email: text("email").notNull().unique(),
  emailVerified: boolean("emailVerified").notNull().default(false), image: text("image"),
  termsAcceptedVersion: text("termsAcceptedVersion"), termsAcceptedAt: timestamp("termsAcceptedAt", { withTimezone: true }),
  createdAt: timestamp("createdAt").notNull().defaultNow(), updatedAt: timestamp("updatedAt").notNull().defaultNow(),
});
// Additive 0007 only. SQL owns the immutable identity/server timestamp trigger.
export const communityProfiles = pgTable("community_profile", {
  userId: text("user_id").primaryKey().references(() => user.id, { onDelete: "cascade" }),
  handle: text("handle").notNull(),
  displayName: text("display_name").notNull().default(""),
  bio: text("bio").notNull().default(""),
  educationLevel: text("education_level").$type<ProfileEducationLevel>().notNull().default("prefer-not-to-say"),
  favoriteTopicIds: text("favorite_topic_ids").array().$type<ProfileTopicId[]>().notNull().default(sql`'{}'::text[]`),
  publicVisibility: boolean("public_visibility").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`clock_timestamp()`),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().default(sql`clock_timestamp()`),
}, (t) => [
  uniqueIndex("community_profile_handle_unique").on(sql`lower(${t.handle})`),
  check("community_profile_handle_format", sql`${t.handle} ~ '^[a-z0-9][a-z0-9_]{2,23}$'`),
  check("community_profile_handle_reserved", sql`${t.handle} NOT IN ('admin','administrator','moderator','mod','physcratic','support','root','system','api','auth','me','profile','profiles','settings','account','login','logout','dashboard','deleted','null','undefined','official','staff')`),
  check("community_profile_display_name_check", sql`char_length(${t.displayName})<=80`),
  check("community_profile_bio_check", sql`char_length(${t.bio})<=500`),
  check("community_profile_education_level_check", sql`${t.educationLevel} IN ('high-school','university','other','prefer-not-to-say')`),
  check("community_profile_favorite_topic_ids_check", sql`cardinality(${t.favoriteTopicIds})<=6 AND (cardinality(${t.favoriteTopicIds})=0 OR array_ndims(${t.favoriteTopicIds})=1) AND array_position(${t.favoriteTopicIds},NULL) IS NULL AND ${t.favoriteTopicIds} <@ ARRAY['mechanics','electromagnetism','waves','thermodynamics','optics','modern-physics']::text[]`),
]);
export const communityProfileWriteLimits = pgTable("community_profile_write_limit", {
  userId: text("user_id").primaryKey().references(() => user.id, { onDelete: "cascade" }),
  windowStart: timestamp("window_start", { withTimezone: true }).notNull(),
  requests: integer("requests").notNull(),
}, (t) => [check("community_profile_write_limit_requests_check", sql`${t.requests} BETWEEN 1 AND 11`)]);

// Additive 0009. SQL owns live eligibility functions and the selection validation trigger.
export const communityBadgeSelections = pgTable("community_badge_selection", {
  userId: text("user_id").primaryKey().references(() => communityProfiles.userId, { onDelete: "cascade" }),
  badgeIds: text("badge_ids").array().$type<BadgeId[]>().notNull().default(sql`'{}'::text[]`),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`clock_timestamp()`),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().default(sql`clock_timestamp()`),
}, (t) => [check("community_badge_selection_ids_check", sql`(
  cardinality(${t.badgeIds})<=2 AND (cardinality(${t.badgeIds})=0 OR (array_ndims(${t.badgeIds})=1 AND array_lower(${t.badgeIds},1)=1))
  AND array_position(${t.badgeIds},NULL) IS NULL AND (cardinality(${t.badgeIds})<2 OR ${t.badgeIds}[1]<>${t.badgeIds}[2])
  AND community_showcase_ids_valid(${t.badgeIds})
  ) IS TRUE`)]);
export const communityAchievementWriteLimits = pgTable("community_achievement_write_limit", {
  userId: text("user_id").primaryKey().references(() => user.id, { onDelete: "cascade" }),
  windowStart: timestamp("window_start", { withTimezone: true }).notNull(),
  requests: integer("requests").notNull(),
}, (t) => [check("community_achievement_write_limit_requests_check", sql`${t.requests} BETWEEN 1 AND 11`)]);

// Additive 0008. SQL owns media identity/state-transition/deletion guards.
export const communityProfileMedia = pgTable("community_profile_media", {
  id: uuid("id").primaryKey(),
  userId: text("user_id").notNull().references(() => communityProfiles.userId, { onDelete: "restrict" }),
  kind: text("kind").$type<"avatar" | "banner">().notNull(),
  pathname: text("pathname").notNull().unique(),
  state: text("state").$type<"pending" | "active" | "retired" | "deleting">().notNull().default("pending"),
  bytes: integer("bytes").notNull(),
  deleteAfter: timestamp("delete_after", { withTimezone: true }).notNull().default(sql`clock_timestamp()+interval '1 hour'`),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`clock_timestamp()`),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().default(sql`clock_timestamp()`),
}, (t) => [
  uniqueIndex("community_profile_media_active").on(t.userId,t.kind).where(sql`${t.state}='active'`),
  index("community_profile_media_owner").on(t.userId,t.createdAt),
  check("community_profile_media_kind_check", sql`${t.kind} IN ('avatar','banner')`),
  check("community_profile_media_state_check", sql`${t.state} IN ('pending','active','retired','deleting')`),
  check("community_profile_media_bytes_check", sql`${t.bytes} BETWEEN 1 AND 1048576`),
  check("community_profile_media_pathname_check", sql`${t.pathname}='community-profile-media/'||${t.id}::text||'.webp'`),
]);
export const communityProfileMediaLimits = pgTable("community_profile_media_limit", {
  userId: text("user_id").primaryKey().references(() => user.id, { onDelete: "cascade" }),
  minuteStart: timestamp("minute_start", { withTimezone: true }).notNull(),
  requests: integer("requests").notNull(),
  dayStart: timestamp("day_start", { withTimezone: true }).notNull(),
  uploads: integer("uploads").notNull(),
}, (t) => [check("community_profile_media_limit_requests_check", sql`${t.requests} BETWEEN 1 AND 6`),
  check("community_profile_media_limit_uploads_check", sql`${t.uploads} BETWEEN 0 AND 21`)]);

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

export const problemRatings = pgTable("problem_rating", {
  problemId: text("problemId").primaryKey(), sourceVersion: text("sourceVersion").notNull(),
  rating: integer("rating"), ratingVersion: integer("ratingVersion").notNull().default(1),
  ratedEnabled: boolean("ratedEnabled").notNull().default(false), checks: jsonb("checks").$type<ProblemAnswerCheck[]>().notNull().default([]),
  reviewedBy: text("reviewedBy"), updatedAt: timestamp("updatedAt", { withTimezone: true }).notNull().defaultNow(),
});

export const individualRatings = pgTable("individual_rating", {
  userId: text("userId").primaryKey(), rating: integer("rating").notNull().default(1200),
  ratedAttempts: integer("ratedAttempts").notNull().default(0), updatedAt: timestamp("updatedAt", { withTimezone: true }).notNull().defaultNow(),
});

export const individualRatingEvents = pgTable("individual_rating_event", {
  id: uuid("id").primaryKey(), userId: text("userId").notNull(), attemptId: uuid("attemptId").notNull().unique(),
  problemId: text("problemId").notNull(), sourceVersion: text("sourceVersion").notNull(), ratingVersion: integer("ratingVersion").notNull(),
  problemRating: integer("problemRating").notNull(), beforeRating: integer("beforeRating").notNull(), afterRating: integer("afterRating").notNull(),
  change: integer("change").notNull(), score: doublePrecision("score").notNull(), expectedScore: doublePrecision("expectedScore").notNull(),
  kFactor: integer("kFactor").notNull().default(32), createdAt: timestamp("createdAt", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [unique("individual_rating_event_once").on(table.userId, table.problemId)]);

export const solutionChecks = pgTable("solution_check", {
  attemptId: uuid("attemptId").primaryKey(), userId: text("userId").notNull(), problemId: text("problemId").notNull(), partId: text("partId").notNull(),
  sourceVersion: text("sourceVersion").notNull(), ratingVersion: integer("ratingVersion").notNull(), matched: boolean("matched").notNull(),
  maxPoints: doublePrecision("maxPoints").notNull(), awardedPoints: doublePrecision("awardedPoints").notNull(), createdAt: timestamp("createdAt", { withTimezone: true }).notNull().defaultNow(),
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

export const coachingInquiries = pgTable("coaching_inquiry", {
  id: uuid("id").primaryKey().defaultRandom(), pathway: text("pathway").notNull(), audience: text("audience").notNull(),
  currentLevel: text("current_level").notNull(), goals: text("goals").notNull(), contact: text("contact").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

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
  index("community_achievement_author_idx").on(t.ownerId,t.id).where(sql`${t.state}='published'`),
  index("authored_problem_discovery_idx").on(t.id).where(sql`${t.state}='published'`),
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
  index("authored_revision_discovery_search_idx").using("gin", sql`authored_discovery_terms(${t.content})`),
  index("authored_revision_discovery_metadata_idx").using("gin", sql`${t.content} jsonb_path_ops`),
  index("authored_revision_discovery_difficulty_idx").on(sql`(${t.content}->>'estimatedDifficulty')`),
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

export const authoredWriteLimits = pgTable("authored_write_limit", {
  userId: text("user_id").primaryKey().references(() => user.id, { onDelete: "cascade" }),
  windowStart: timestamp("window_start", { withTimezone: true }).notNull(),
  requests: integer("requests").notNull(),
}, (t) => [check("authored_write_limit_requests_check", sql`${t.requests}>0`)]);

// Server-owned author media. SQL defines deferred sealing/lifecycle triggers.
export const authorMedia = pgTable(
  "author_media",
  {
    id: uuid("id").primaryKey(),
    problemId: uuid("problem_id")
      .notNull()
      .references(() => authoredProblems.id, { onDelete: "restrict" }),
    purpose: text("purpose")
      .$type<
        "statement-image" | "solution-image" | "statement-pdf" | "solution-pdf"
      >()
      .notNull(),
    pathname: text("pathname").notNull().unique(),
    filename: text("filename").notNull(),
    mediaType: text("media_type").notNull(),
    bytes: integer("bytes").notNull(),
    sha256: text("sha256").notNull(),
    state: text("state")
      .$type<"pending" | "ready" | "deleting">()
      .notNull()
      .default("pending"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    unique("author_media_id_problem_id_purpose_key").on(
      t.id,
      t.problemId,
      t.purpose,
    ),
    index("author_media_problem_idx").on(t.problemId),
    index("author_media_cleanup_idx").on(t.state, t.createdAt),
    check(
      "author_media_purpose_check",
      sql`${t.purpose} in ('statement-image','solution-image','statement-pdf','solution-pdf')`,
    ),
    check(
      "author_media_media_type_check",
      sql`${t.mediaType} in ('image/png','image/jpeg','image/webp','application/pdf')`,
    ),
    check(
      "author_media_bytes_check",
      sql`${t.bytes}>0 and ${t.bytes}<=3145728`,
    ),
    check("author_media_sha256_check", sql`${t.sha256} ~ '^[a-f0-9]{64}$'`),
    check(
      "author_media_state_check",
      sql`${t.state} in ('pending','ready','deleting')`,
    ),
    check(
      "author_media_purpose_type_check",
      sql`(${t.purpose} in ('statement-pdf','solution-pdf'))=(${t.mediaType}='application/pdf')`,
    ),
  ],
);
export const authorMediaUsage = pgTable(
  "author_media_usage",
  {
    userId: text("user_id")
      .primaryKey()
      .references(() => user.id, { onDelete: "cascade" }),
    day: date("day", { mode: "string" }).notNull(),
    attempts: integer("attempts").notNull(),
  },
  (t) => [
    check(
      "author_media_usage_attempts_check",
      sql`${t.attempts}>0 and ${t.attempts}<=31`,
    ),
  ],
);
export const authorDraftMedia = pgTable(
  "author_draft_media",
  {
    problemId: uuid("problem_id")
      .notNull()
      .references(() => authoredDrafts.problemId, { onDelete: "cascade" }),
    mediaId: uuid("media_id").notNull(),
    purpose: text("purpose").notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.problemId, t.mediaId] }),
    index("author_draft_media_media_idx").on(t.mediaId),
    foreignKey({
      columns: [t.mediaId, t.problemId, t.purpose],
      foreignColumns: [
        authorMedia.id,
        authorMedia.problemId,
        authorMedia.purpose,
      ],
    }),
  ],
);
export const authorRevisionMedia = pgTable(
  "author_revision_media",
  {
    revisionId: uuid("revision_id").notNull(),
    problemId: uuid("problem_id").notNull(),
    mediaId: uuid("media_id").notNull(),
    purpose: text("purpose").notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.revisionId, t.mediaId] }),
    index("author_revision_media_media_idx").on(t.mediaId),
    foreignKey({
      columns: [t.problemId, t.revisionId],
      foreignColumns: [authoredRevisions.problemId, authoredRevisions.id],
    }),
    foreignKey({
      columns: [t.mediaId, t.problemId, t.purpose],
      foreignColumns: [
        authorMedia.id,
        authorMedia.problemId,
        authorMedia.purpose,
      ],
    }),
  ],
);

// Student-authored attempts: SQL is authoritative for JSON/outcome/current-publication/immutability guards.
export const authoredStudentRate = pgTable(
  "authored_student_rate",
  {
    userId: text("user_id")
      .primaryKey()
      .references(() => user.id, { onDelete: "cascade" }),
    windowStart: timestamp("window_start", { withTimezone: true }).notNull(),
    requests: integer("requests").notNull(),
    submissions: integer("submissions").notNull(),
  },
  (t) => [
    check(
      "authored_student_rate_requests_check",
      sql`${t.requests} between 1 and 61`,
    ),
    check(
      "authored_student_rate_submissions_check",
      sql`${t.submissions} between 0 and 21`,
    ),
  ],
);
export const authoredAttempts = pgTable(
  "authored_attempt",
  {
    id: uuid("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    problemId: uuid("problem_id").notNull(),
    revisionId: uuid("revision_id").notNull(),
    partId: uuid("part_id").notNull(),
    idempotencyKey: uuid("idempotency_key").notNull(),
    answer: jsonb("answer")
      .$type<
        import("@/lib/authored-grading-contracts").AuthoredGradeInput["answer"]
      >()
      .notNull(),
    status: text("status")
      .$type<
        import("@/lib/authored-attempt-contracts").StudentGrade["status"]
      >()
      .notNull(),
    reason: text("reason")
      .$type<
        import("@/lib/authored-attempt-contracts").StudentGrade["reason"]
      >()
      .notNull(),
    engineVersion: text("engine_version")
      .$type<
        import("@/lib/authored-attempt-contracts").StudentGrade["engineVersion"]
      >()
      .notNull(),
    attemptNumber: bigint("attempt_number", { mode: "bigint" }).notNull(),
    spoilerPolicy: text("spoiler_policy").notNull().default("no-reveal-v1"),
    assisted: boolean("assisted").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true, precision: 3 })
      .notNull()
      .default(sql`clock_timestamp()`),
  },
  (t) => [
    unique("authored_attempt_user_id_idempotency_key_key").on(
      t.userId,
      t.idempotencyKey,
    ),
    unique(
      "authored_attempt_user_id_revision_id_part_id_attempt_number_key",
    ).on(t.userId, t.revisionId, t.partId, t.attemptNumber),
    index("authored_attempt_history_idx").on(
      t.userId,
      t.createdAt.desc(),
      t.id.desc(),
    ),
    index("authored_attempt_problem_idx").on(
      t.userId,
      t.problemId,
      t.createdAt.desc(),
      t.id.desc(),
    ),
    index("authored_attempt_revision_idx").on(t.revisionId, t.partId),
    index("community_solve_scan_idx").on(t.revisionId,t.partId,t.userId).where(sql`${t.status}='correct' AND ${t.assisted}=false`),
    index("community_achievement_attempt_idx").on(t.userId,t.problemId,t.revisionId,t.partId).where(sql`${t.status}='correct' AND ${t.assisted}=false`),
    foreignKey({
      columns: [t.problemId, t.revisionId],
      foreignColumns: [authoredRevisions.problemId, authoredRevisions.id],
    }).onDelete("restrict"),
    foreignKey({
      columns: [t.revisionId, t.partId],
      foreignColumns: [
        authoredRevisionParts.revisionId,
        authoredRevisionParts.partId,
      ],
    }).onDelete("restrict"),
    check(
      "authored_attempt_attempt_number_check",
      sql`${t.attemptNumber} > 0`,
    ),
    check(
      "authored_attempt_engine_version_check",
      sql`${t.engineVersion} in ('numeric-v1','symbolic-v1')`,
    ),
    check(
      "authored_attempt_spoiler_policy_check",
      sql`${t.spoilerPolicy}='no-reveal-v1'`,
    ),
  ],
);

// Phase 6C-A revocable authorization metadata; sealed revision solutions remain untouched.
// SQL0005 is authoritative for lock ordering, generations, expiry and ledger/attempt guards.
export const authoredSolutionPermissions = pgTable(
  "authored_solution_permission",
  {
    problemId: uuid("problem_id").notNull(),
    revisionId: uuid("revision_id").notNull(),
    partId: uuid("part_id").notNull(),
    approvedBy: text("approved_by")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    authorizationId: uuid("authorization_id").notNull().unique(),
    version: integer("version").notNull(),
    enabled: boolean("enabled").notNull().default(false),
    expiresAt: timestamp("expires_at", { withTimezone: true, precision: 3 }),
    updatedAt: timestamp("updated_at", { withTimezone: true, precision: 3 })
      .notNull()
      .default(sql`clock_timestamp()`),
  },
  (t) => [
    primaryKey({ columns: [t.revisionId, t.partId] }),
    unique().on(t.revisionId, t.partId, t.authorizationId),
    foreignKey({
      columns: [t.problemId, t.revisionId],
      foreignColumns: [authoredRevisions.problemId, authoredRevisions.id],
    }).onDelete("restrict"),
    foreignKey({
      columns: [t.revisionId, t.partId],
      foreignColumns: [
        authoredRevisionParts.revisionId,
        authoredRevisionParts.partId,
      ],
    }).onDelete("restrict"),
    check("authored_solution_permission_version_check", sql`${t.version}>0`),
    check(
      "authored_solution_permission_check",
      sql`${t.enabled} OR ${t.expiresAt} IS NULL`,
    ),
  ],
);
export const authoredSolutionPermissionMedia = pgTable(
  "authored_solution_permission_media",
  {
    revisionId: uuid("revision_id").notNull(),
    partId: uuid("part_id").notNull(),
    authorizationId: uuid("authorization_id").notNull(),
    mediaId: uuid("media_id").notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.revisionId, t.partId, t.mediaId] }),
    foreignKey({
      columns: [t.revisionId, t.partId, t.authorizationId],
      foreignColumns: [
        authoredSolutionPermissions.revisionId,
        authoredSolutionPermissions.partId,
        authoredSolutionPermissions.authorizationId,
      ],
    }),
    foreignKey({
      columns: [t.revisionId, t.mediaId],
      foreignColumns: [
        authorRevisionMedia.revisionId,
        authorRevisionMedia.mediaId,
      ],
    }).onDelete("restrict"),
  ],
);
export const authoredSolutionReveals = pgTable(
  "authored_solution_reveal",
  {
    id: uuid("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    problemId: uuid("problem_id").notNull(),
    revisionId: uuid("revision_id").notNull(),
    partId: uuid("part_id").notNull(),
    authorizationId: uuid("authorization_id").notNull(),
    policy: text("policy").notNull().default("explicit-solution-v1"),
    createdAt: timestamp("created_at", { withTimezone: true, precision: 3 })
      .notNull()
      .default(sql`clock_timestamp()`),
  },
  (t) => [
    unique().on(t.userId, t.revisionId, t.partId, t.authorizationId),
    index("authored_solution_reveal_authorization_idx").on(t.authorizationId),
    foreignKey({
      columns: [t.problemId, t.revisionId],
      foreignColumns: [authoredRevisions.problemId, authoredRevisions.id],
    }).onDelete("restrict"),
    foreignKey({
      columns: [t.revisionId, t.partId],
      foreignColumns: [
        authoredRevisionParts.revisionId,
        authoredRevisionParts.partId,
      ],
    }).onDelete("restrict"),
    check(
      "authored_solution_reveal_policy_check",
      sql`${t.policy}='explicit-solution-v1'`,
    ),
  ],
);

// 0010 SQL owns immutable submission/audit guards, state transitions and locked staff authorization.
export const communityStaff = pgTable('community_staff', {
 userId:text('user_id').primaryKey().references(()=>user.id,{onDelete:'restrict'}), role:text('role').notNull(),reason:text('reason').notNull(),updatedAt:timestamp('updated_at',{withTimezone:true}).notNull().defaultNow(),
},t=>[check('community_staff_role_check',sql`${t.role} IN ('admin','moderator','none')`)]);
export const communityStaffAudit=pgTable('community_staff_audit',{
 id:bigint('id',{mode:'number'}).primaryKey().generatedAlwaysAsIdentity(),userId:text('user_id').notNull().references(()=>user.id),oldRole:text('old_role'),newRole:text('new_role').notNull(),reason:text('reason').notNull(),operator:text('operator').notNull(),createdAt:timestamp('created_at',{withTimezone:true}).notNull().defaultNow(),
});
export const communityMedalClaims=pgTable('community_medal_claim',{
 id:uuid('id').primaryKey(),userId:text('user_id').notNull().references(()=>user.id,{onDelete:'restrict'}),competition:text('competition').notNull(),award:text('award').notNull(),year:integer('year').notNull(),country:text('country').notNull(),competitionName:text('competition_name').notNull(),certificateName:text('certificate_name').notNull(),pathname:text('pathname').notNull().unique(),bytes:integer('bytes').notNull(),sha256:text('sha256').notNull(),state:text('state').notNull().default('uploading'),version:integer('version').notNull().default(1),reviewerId:text('reviewer_id').references(()=>user.id),reason:text('reason').notNull().default(''),createdAt:timestamp('created_at',{withTimezone:true}).notNull().defaultNow(),updatedAt:timestamp('updated_at',{withTimezone:true}).notNull().defaultNow(),
},t=>[index('community_medal_owner').on(t.userId,t.createdAt.desc(),t.id),index('community_medal_queue').on(t.state,t.createdAt,t.id),uniqueIndex('community_medal_pending').on(t.userId,t.competition,t.year,sql`CASE WHEN ${t.competition}='National' THEN ${t.country} ELSE '' END`,sql`CASE WHEN ${t.competition}='National' THEN lower(${t.competitionName}) ELSE '' END`).where(sql`${t.state} IN ('uploading','pending','more-info','approved')`)]);
export const communityMedalAudit=pgTable('community_medal_audit',{
 id:bigint('id',{mode:'number'}).primaryKey().generatedAlwaysAsIdentity(),claimId:uuid('claim_id').notNull().references(()=>communityMedalClaims.id),version:integer('version').notNull(),actorId:text('actor_id').notNull().references(()=>user.id),state:text('state').notNull(),reason:text('reason').notNull(),createdAt:timestamp('created_at',{withTimezone:true}).notNull().defaultNow(),
},t=>[unique().on(t.claimId,t.version)]);
export const communityMedalLimits=pgTable('community_medal_limit',{
 userId:text('user_id').primaryKey().references(()=>user.id),minute:timestamp('minute',{withTimezone:true}).notNull(),requests:integer('requests').notNull(),day:date('day').notNull(),uploads:integer('uploads').notNull(),
});

// Additive 0012. SQL guards own immutable identities, publication locks and atomic totals.
export const communityProblemTotals=pgTable('community_problem_total',{
 problemKey:text('problem_key').primaryKey(),favourites:bigint('favourites',{mode:'number'}).notNull().default(0),
},t=>[check('community_problem_total_favourites_check',sql`${t.favourites}>=0`)]);
export const communityFavourites=pgTable('community_favourite',{
 userId:text('user_id').notNull().references(()=>user.id,{onDelete:'cascade'}),
 problemKey:text('problem_key').notNull(),
 authoredProblemId:uuid('authored_problem_id').generatedAlwaysAs(sql`CASE WHEN problem_key LIKE 'authored:%' THEN substring(problem_key FROM 10)::uuid END`).references(()=>authoredProblems.id,{onDelete:'cascade'}),
 createdAt:timestamp('created_at',{withTimezone:true}).notNull().default(sql`clock_timestamp()`),
},t=>[primaryKey({columns:[t.userId,t.problemKey]}),index('community_favourite_problem_idx').on(t.problemKey,t.userId),index('community_favourite_authored_idx').on(t.authoredProblemId).where(sql`${t.authoredProblemId} IS NOT NULL`),check('community_favourite_key_check',sql`${t.problemKey} ~ '^authored:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' OR ${t.problemKey}=ANY(${sql.raw("ARRAY["+arenaRegistry.problems.map(p=>"'arena:"+p.id+"'").join(',')+"]::text[]")})`)]);
export const communityFavouriteLimits=pgTable('community_favourite_limit',{
 userId:text('user_id').primaryKey().references(()=>user.id,{onDelete:'cascade'}),windowStart:timestamp('window_start',{withTimezone:true}).notNull(),requests:integer('requests').notNull(),
},t=>[check('community_favourite_limit_requests_check',sql`${t.requests} BETWEEN 1 AND 61`)]);
