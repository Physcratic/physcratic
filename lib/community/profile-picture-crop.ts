import { z } from "zod";
import { profileMediaPolicy } from "./profile-media-contracts";

export const profilePictureCropSchema = z.strictObject({
  zoom: z.number().min(1).max(3),
  horizontal: z.number().min(0).max(100),
  vertical: z.number().min(0).max(100),
});
export type ProfilePictureCrop = z.infer<typeof profilePictureCropSchema>;
export const defaultProfilePictureCrop: ProfilePictureCrop = { zoom: 1, horizontal: 50, vertical: 50 };

export function profilePictureCropBounds(width: number, height: number, adjustment: ProfilePictureCrop) {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 32 || height < 32 ||
    width > profileMediaPolicy.maxEdge || height > profileMediaPolicy.maxEdge ||
    width * height > profileMediaPolicy.maxPixels) throw new RangeError("Unsupported image dimensions");
  const crop = profilePictureCropSchema.parse(adjustment);
  const size = Math.max(1, Math.floor(Math.min(width, height) / crop.zoom));
  return {
    left: Math.floor((width - size) * crop.horizontal / 100),
    top: Math.floor((height - size) * crop.vertical / 100),
    width: size,
    height: size,
  };
}

export function isSupportedProfileImage(bytes: Uint8Array) {
  const starts = (offset: number, magic: number[]) => magic.every((value, index) => bytes[offset + index] === value);
  return starts(0, [137, 80, 78, 71, 13, 10, 26, 10]) || starts(0, [255, 216, 255]) ||
    (starts(0, [82, 73, 70, 70]) && starts(8, [87, 69, 66, 80]));
}
