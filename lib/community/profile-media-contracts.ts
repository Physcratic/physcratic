import { z } from "zod";

export const profileMediaKinds = ["avatar", "banner"] as const;
export type ProfileMediaKind = typeof profileMediaKinds[number];
export const profileMediaPolicy = {
  avatar: { inputBytes: 2 * 1024 * 1024, width: 512, height: 512 },
  banner: { inputBytes: 5 * 1024 * 1024, width: 1600, height: 400 },
  maxOutputBytes: 1024 * 1024,
  maxPixels: 20_000_000,
  maxEdge: 8192,
  maxObjects: 8,
  writesPerMinute: 5,
  uploadsPerDay: 20,
} as const;
export const profileMediaItemSchema = z.strictObject({
  id: z.uuid(),
  url: z.string().regex(/^\/api\/community\/profile-media\/image\/[0-9a-f-]{36}$/),
});
export const profileMediaSetSchema = z.strictObject({
  avatar: profileMediaItemSchema.nullable(),
  banner: profileMediaItemSchema.nullable(),
});
export type ProfileMediaSet = z.infer<typeof profileMediaSetSchema>;
export const emptyProfileMedia: ProfileMediaSet = { avatar: null, banner: null };
