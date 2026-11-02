import { z } from "zod";
import { physicsTopics } from "../physics-taxonomy";
import { profileHandleSchema, profileEducationLevels } from "./profile-contracts";
import { profileMediaSetSchema } from "./profile-media-contracts";

export const publicProfileSchema = z.strictObject({
  handle: profileHandleSchema, displayName: z.string(), bio: z.string(),
  educationLevel: z.enum(profileEducationLevels),
  favoriteTopicIds: z.array(z.enum(physicsTopics.map(topic => topic.id))),
});
export type PublicProfile = z.infer<typeof publicProfileSchema>;
export const ownProfileSchema = publicProfileSchema.extend({ userId: z.string(),
  publicVisibility: z.boolean(), createdAt: z.iso.datetime(), updatedAt: z.iso.datetime() });
export type OwnProfile = z.infer<typeof ownProfileSchema>;
export const ownProfileResponse = z.strictObject({ profile: ownProfileSchema.nullable() });
export const mediaResponse = z.strictObject({ media: profileMediaSetSchema, cleanupPending: z.boolean().optional() });
export const educationLabels = {
  "high-school": "High School", university: "University", other: "Other", "prefer-not-to-say": "Prefer Not to Say",
} as const;
export class ProfileRequestError extends Error {
  constructor(public status: number) {
    super(status === 401 ? "Sign in to continue." : status === 403 ? "Verify your email and try again from this site."
      : status === 409 ? "That username is unavailable or cannot be changed."
      : status === 429 ? "Too many changes. Wait a little before trying again."
      : status === 413 ? "The selected image is too large."
      : status === 400 ? "Check your details or choose a valid PNG, JPEG or WebP image."
      : "This change could not be completed. Your saved details are still available. Try again.");
  }
}
export async function profileRequest(path: string, init: RequestInit = {}) {
  const response = await fetch(path, { ...init, credentials: "same-origin", cache: "no-store",
    signal: init.signal ?? AbortSignal.timeout(20000) });
  if (!response.ok) throw new ProfileRequestError(response.status);
  return response.json();
}

// Dismissal is device-local, versioned, account-specific, and contains no form fields.
export function onboardingKey(userId: string) { return `physcratic:profile-setup:v1:${userId}`; }
export function dismissProfileSetup(userId: string, state: "dismissed" | "completed" = "dismissed") {
  try { localStorage.setItem(onboardingKey(userId), state); } catch { /* No storage means no automatic invitation. */ }
  window.dispatchEvent(new Event("community-profile-setup"));
}
