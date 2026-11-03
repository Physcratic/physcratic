import "server-only";
import sharp from "sharp";
import { profileMediaPolicy as policy, type ProfileMediaKind } from "./profile-media-contracts";
import { isSupportedProfileImage, profileImageCropBounds, type ProfilePictureCrop } from "./profile-picture-crop";

export class InvalidProfileImage extends Error {}
export async function encodeProfileImage(bytes: Uint8Array, kind: ProfileMediaKind, crop?: ProfilePictureCrop) {
  if (bytes.byteLength > policy[kind].inputBytes) throw new RangeError("Image too large");
  if (!isSupportedProfileImage(bytes)) throw new InvalidProfileImage();
  try {
    const image = sharp(bytes, { failOn: "error", limitInputPixels: policy.maxPixels, animated: false });
    const metadata = await image.metadata();
    if (!metadata.width || !metadata.height || metadata.width > policy.maxEdge || metadata.height > policy.maxEdge ||
      metadata.width < 32 || metadata.height < 32 || (metadata.pages ?? 1) !== 1 ||
      !["png", "jpeg", "webp"].includes(metadata.format ?? "")) throw new InvalidProfileImage();
    // Crop after EXIF rotation, matching the browser preview. Re-encoding strips metadata.
    const oriented = image.rotate();
    if (crop) {
      const swapped = (metadata.orientation ?? 1) >= 5;
      oriented.extract(profileImageCropBounds(swapped ? metadata.height : metadata.width, swapped ? metadata.width : metadata.height, crop, kind));
    }
    const output = await oriented.resize(policy[kind].width, policy[kind].height, { fit: "cover" })
      .webp({ quality: 82, effort: 4 }).toBuffer();
    if (output.byteLength > policy.maxOutputBytes) throw new InvalidProfileImage();
    return output;
  } catch { throw new InvalidProfileImage(); }
}
