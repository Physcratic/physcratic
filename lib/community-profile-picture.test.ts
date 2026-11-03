import assert from "node:assert/strict";
import test from "node:test";
import sharp from "sharp";
import { defaultProfilePictureCrop, isSupportedProfileImage, profilePictureCropBounds, profilePictureCropSchema } from "./community/profile-picture-crop";
import { encodeProfileImage, InvalidProfileImage } from "./community/profile-image";
import type { Pool } from "pg";
import { createProfileMediaApi } from "./community/profile-media-api";

for (const [width, height] of [[800, 400], [400, 800], [512, 512]]) {
  test(`picture crop stays within ${width} by ${height} at every edge and zoom`, () => {
    for (const zoom of [1, 1.1, 2, 3]) for (const horizontal of [0, 50, 100]) for (const vertical of [0, 50, 100]) {
      const bounds = profilePictureCropBounds(width, height, { zoom, horizontal, vertical });
      assert.equal(bounds.width, bounds.height);
      assert.ok(bounds.left >= 0 && bounds.top >= 0);
      assert.ok(bounds.left + bounds.width <= width);
      assert.ok(bounds.top + bounds.height <= height);
    }
  });
}
test("default crop is centred and all crop keys and numbers are bounded", () => {
  assert.deepEqual(profilePictureCropBounds(800, 400, defaultProfilePictureCrop), { left: 200, top: 0, width: 400, height: 400 });
  for (const invalid of [null, [], {}, { ...defaultProfilePictureCrop, x: 1 }, { ...defaultProfilePictureCrop, zoom: 0 },
    { ...defaultProfilePictureCrop, zoom: 3.1 }, { ...defaultProfilePictureCrop, horizontal: -1 },
    { ...defaultProfilePictureCrop, vertical: 101 }, { ...defaultProfilePictureCrop, zoom: Infinity },
    { ...defaultProfilePictureCrop, vertical: NaN }, { ...defaultProfilePictureCrop, zoom: "2" }]) {
    assert.equal(profilePictureCropSchema.safeParse(invalid).success, false);
  }
  for (const [width, height] of [[31, 100], [100, 8193], [5000, 5000], [NaN, 500], [500.5, 500]]) {
    assert.throws(() => profilePictureCropBounds(width, height, defaultProfilePictureCrop));
  }
});
test("picture signatures reject SVG, GIF, truncated headers and MIME spoofing", () => {
  for (const input of ["<svg xmlns='http://www.w3.org/2000/svg'/>", "GIF89a", "RIFF....PNG", "", "not a jpeg"]) {
    assert.equal(isSupportedProfileImage(Buffer.from(input)), false);
  }
  for (const input of [new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]), new Uint8Array([255, 216, 255]), Buffer.from("RIFF0000WEBP")]) {
    assert.equal(isSupportedProfileImage(input), true);
  }
});
async function splitImage(orientation?: number) {
  const pixels = Buffer.alloc(800 * 400 * 3);
  for (let y = 0; y < 400; y++) for (let x = 0; x < 800; x++) {
    const start = (y * 800 + x) * 3;
    pixels[start] = x < 400 ? 255 : 0;
    pixels[start + 2] = x < 400 ? 0 : 255;
  }
  const image = sharp(pixels, { raw: { width: 800, height: 400, channels: 3 } });
  return orientation ? image.withMetadata({ orientation }).jpeg().toBuffer() : image.png().toBuffer();
}
test("server applies requested avatar crop and strips metadata without trusting MIME", async () => {
  const bytes = await splitImage();
  for (const [horizontal, channel] of [[0, 0], [100, 2]]) {
    const result = await encodeProfileImage(bytes, "avatar", { zoom: 1, horizontal, vertical: 50 });
    const metadata = await sharp(result).metadata();
    assert.equal(metadata.format, "webp"); assert.equal(metadata.width, 512); assert.equal(metadata.height, 512);
    assert.equal(metadata.exif, undefined); assert.equal(metadata.orientation, undefined);
    const { data, info } = await sharp(result).raw().toBuffer({ resolveWithObject: true });
    const middle = (256 * info.width + 256) * info.channels;
    assert.ok(data[middle + channel] > 240);
    assert.ok(data[middle + (channel === 0 ? 2 : 0)] < 15);
  }
});
test("EXIF-oriented crops use displayed dimensions and position", async () => {
  const bytes = await splitImage(6);
  for (const [vertical, channel] of [[0, 0], [100, 2]]) {
    const result = await encodeProfileImage(bytes, "avatar", { zoom: 1, horizontal: 50, vertical });
    const { data, info } = await sharp(result).raw().toBuffer({ resolveWithObject: true });
    const middle = (256 * info.width + 256) * info.channels;
    assert.ok(data[middle + channel] > 240);
  }
});
test("banners do not accept avatar crop settings and old callers still work", async () => {
  const bytes = await splitImage();
  await assert.rejects(encodeProfileImage(bytes, "banner", defaultProfilePictureCrop), InvalidProfileImage);
  const avatar = await sharp(await encodeProfileImage(bytes, "avatar")).metadata();
  const banner = await sharp(await encodeProfileImage(bytes, "banner")).metadata();
  assert.equal(avatar.width, 512); assert.equal(banner.width, 1600); assert.equal(banner.height, 400);
  await assert.rejects(encodeProfileImage(bytes, "avatar", { ...defaultProfilePictureCrop, zoom: 0 }), InvalidProfileImage);
});
test("malformed, oversized and banner crop headers are rejected before image reads or reservations", async () => {
  let queries = 0;
  const pool = { query: async () => { queries++; return { rows: [{ requests: 1, uploads: 1 }] }; } } as unknown as Pool;
  const storage = { put: async () => { throw new Error("Unexpected storage write"); }, get: async () => null, del: async () => {} };
  const api = createProfileMediaApi({ pool, storage, user: async () => ({ id: "owner", emailVerified: true }), origin: () => true });
  for (const [kind, crop] of [["avatar", "null"], ["avatar", "{"], ["avatar", "x".repeat(257)],
    ["avatar", JSON.stringify({ ...defaultProfilePictureCrop, zoom: 4 })],
    ["avatar", JSON.stringify({ ...defaultProfilePictureCrop, url: "https://example.invalid" })],
    ["banner", JSON.stringify(defaultProfilePictureCrop)]]) {
    const response = await api("upload", new Request("https://physcratic.test/api", { method: "PUT", headers: { "X-Profile-Picture-Crop": crop }, body: "not an image" }), kind);
    assert.equal(response.status, 400);
  }
  assert.equal(queries, 6);
  for (const [user, origin, status] of [[null, true, 401], [{ id: "owner", emailVerified: false }, true, 403],
    [{ id: "owner", emailVerified: true }, false, 403]] as const) {
    const protectedApi = createProfileMediaApi({ pool, storage, user: async () => user, origin: () => origin });
    const response = await protectedApi("upload", new Request("https://physcratic.test/api", { method: "PUT", headers: { "X-Profile-Picture-Crop": "{}" }, body: "not an image" }), "avatar");
    assert.equal(response.status, status);
  }
  assert.equal(queries, 6);
});
