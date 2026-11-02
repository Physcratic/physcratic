import "server-only";
import sharp from "sharp";
import { profileMediaPolicy as policy, type ProfileMediaKind } from "./profile-media-contracts";

export class InvalidProfileImage extends Error {}
export async function encodeProfileImage(bytes: Uint8Array, kind: ProfileMediaKind) {
  if (bytes.byteLength > policy[kind].inputBytes) throw new RangeError("Image too large");
  const starts = (...magic: number[]) => magic.every((value, i) => bytes[i] === value);
  const ascii = (start: number, end: number) => Buffer.from(bytes.subarray(start, end)).toString("ascii");
  if (!(starts(137, 80, 78, 71, 13, 10, 26, 10) || starts(255, 216, 255) ||
    (ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP"))) throw new InvalidProfileImage();
  try {
    const image = sharp(bytes, { failOn: "error", limitInputPixels: policy.maxPixels, animated: false });
    const metadata = await image.metadata();
    if (!metadata.width || !metadata.height || metadata.width > policy.maxEdge || metadata.height > policy.maxEdge ||
      metadata.width < 32 || metadata.height < 32 || (metadata.pages ?? 1) !== 1 ||
      !["png", "jpeg", "webp"].includes(metadata.format ?? "")) throw new InvalidProfileImage();
    // Rotate from orientation, then re-encode pixels. Sharp strips EXIF/XMP/ICC by default.
    const output = await image.rotate().resize(policy[kind].width, policy[kind].height, { fit: "cover" })
      .webp({ quality: 82, effort: 4 }).toBuffer();
    if (output.byteLength > policy.maxOutputBytes) throw new InvalidProfileImage();
    return output;
  } catch { throw new InvalidProfileImage(); }
}
