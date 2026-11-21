import { z } from "zod";
import { physicsTopics } from "../physics-taxonomy";

export const PROFILE_PUBLICATION_POLICY_VERSION = "b1-v1";

export const reservedProfileHandles = [
  "admin", "administrator", "moderator", "mod", "physcratic", "support",
  "root", "system", "api", "auth", "me", "profile", "profiles", "settings",
  "account", "login", "logout", "dashboard", "deleted", "null", "undefined",
  "official", "staff",
] as const;
export const profileEducationLevels = ["high-school", "university", "other", "prefer-not-to-say"] as const;
export type ProfileEducationLevel = typeof profileEducationLevels[number];
export type ProfileTopicId = typeof physicsTopics[number]["id"];
export const profileHandleSchema = z.string().trim().toLowerCase()
  .regex(/^[a-z0-9][a-z0-9_]{2,23}$/)
  .refine(value => !(reservedProfileHandles as readonly string[]).includes(value));
const text = (max: number, multiline = false) => z.string().refine(value =>
  value.isWellFormed() && [...value].length <= max &&
  !(multiline ? /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/ : /[\u0000-\u001f\u007f]/).test(value));
const topicIds = physicsTopics.map(topic => topic.id);
export const profilePatchSchema = z.strictObject({
  handle: profileHandleSchema.optional(),
  displayName: text(80).optional(),
  bio: text(500, true).optional(),
  educationLevel: z.enum(profileEducationLevels).optional(),
  favoriteTopicIds: z.array(z.enum(topicIds)).max(topicIds.length)
    .refine(ids => new Set(ids).size === ids.length).optional(),
}).refine(value => Object.keys(value).length > 0);

export const profileMutationSchema = z.union([
  profilePatchSchema,
  z.strictObject({ acknowledge: z.literal(PROFILE_PUBLICATION_POLICY_VERSION) }),
  z.strictObject({ deactivate: z.literal(true) }),
]);

export type ProfileMutation = z.infer<typeof profileMutationSchema>;

export interface CommunityProfile {
  userId: string;
  handle: string;
  displayName: string;
  bio: string;
  educationLevel: ProfileEducationLevel;
  favoriteTopicIds: ProfileTopicId[];
  publicVisibility: boolean;
  publicationState: "private" | "pending" | "public" | "deactivated";
  createdAt: Date;
  updatedAt: Date;
}

export const profilePolicy = { writesPerMinute: 10, maxBodyBytes: 8192 } as const;
