import assert from "node:assert/strict";
import test from "node:test";
import sharp from "sharp";
import type { Pool } from "pg";
import { defaultProfilePictureCrop, profileImageCropBounds } from "./community/profile-picture-crop";
import { encodeProfileImage, InvalidProfileImage } from "./community/profile-image";
import { createProfileMediaApi } from "./community/profile-media-api";

for (const [width, height] of [[1600, 400], [800, 800], [400, 1600], [1600, 100], [33, 35], [8192, 32]]) {
  test(`banner crop keeps a four-to-one ratio within ${width} by ${height}`, () => {
    for (const zoom of [1, 1.1, 2, 3]) for (const horizontal of [0, 50, 100]) for (const vertical of [0, 50, 100]) {
      const bounds = profileImageCropBounds(width, height, { zoom, horizontal, vertical }, "banner");
      assert.equal(bounds.width, bounds.height * 4);
      assert.ok(bounds.width > 0 && bounds.height > 0);
      assert.ok(Number.isInteger(bounds.left) && Number.isInteger(bounds.top));
      assert.ok(bounds.left >= 0 && bounds.top >= 0);
      assert.ok(bounds.left + bounds.width <= width && bounds.top + bounds.height <= height);
    }
  });
}
test("default banner crop is centred and rejects invalid dimensions and settings", () => {
  assert.deepEqual(profileImageCropBounds(800, 800, defaultProfilePictureCrop, "banner"), { left: 0, top: 300, width: 800, height: 200 });
  for (const [width, height] of [[31, 100], [100, 8193], [5000, 5000], [NaN, 500], [500.5, 500]])
    assert.throws(() => profileImageCropBounds(width, height, defaultProfilePictureCrop, "banner"));
  for (const crop of [{ zoom: 0 }, { vertical: 101 }, { horizontal: -1 }, { zoom: Infinity }, { extra: true }])
    assert.throws(() => profileImageCropBounds(800, 800, { ...defaultProfilePictureCrop, ...crop }, "banner"));
});
async function stripedImage(orientation?: number) {
  const pixels = Buffer.alloc(800 * 800 * 3);
  for (let y = 0; y < 800; y++) for (let x = 0; x < 800; x++) {
    const start = (y * 800 + x) * 3;
    pixels[start] = y < 400 ? 255 : 0;
    pixels[start + 2] = y < 400 ? 0 : 255;
  }
  const image = sharp(pixels, { raw: { width: 800, height: 800, channels: 3 } });
  return orientation ? image.withMetadata({ orientation }).jpeg().toBuffer() : image.png().toBuffer();
}
async function assertCropColour(bytes: Uint8Array, vertical: number, channel: number) {
  const result = await encodeProfileImage(bytes, "banner", { zoom: 1, horizontal: 50, vertical });
  const metadata = await sharp(result).metadata();
  assert.equal(metadata.format, "webp"); assert.equal(metadata.width, 1600); assert.equal(metadata.height, 400);
  assert.equal(metadata.exif, undefined); assert.equal(metadata.orientation, undefined);
  const { data, info } = await sharp(result).raw().toBuffer({ resolveWithObject: true });
  const middle = (200 * info.width + 800) * info.channels;
  assert.ok(data[middle + channel] > 240);
  assert.ok(data[middle + (channel === 0 ? 2 : 0)] < 15);
}
test("banner encoder applies vertical positioning and strips source metadata", async () => {
  const bytes = await stripedImage();
  await assertCropColour(bytes, 0, 0); await assertCropColour(bytes, 100, 2);
  await assert.rejects(encodeProfileImage(bytes, "banner", { ...defaultProfilePictureCrop, zoom: 4 }), InvalidProfileImage);
});
test("banner crops follow EXIF orientation before calculating wide bounds", async () => {
  const bytes = await stripedImage(3);
  await assertCropColour(bytes, 0, 2); await assertCropColour(bytes, 100, 0);
  const rotated = await sharp({ create: { width: 800, height: 400, channels: 3, background: "red" } }).withMetadata({ orientation: 6 }).jpeg().toBuffer();
  const result = await encodeProfileImage(rotated, "banner", { zoom: 3, horizontal: 100, vertical: 100 });
  const metadata = await sharp(result).metadata();
  assert.equal(metadata.width, 1600); assert.equal(metadata.height, 400);
});
test("banner normalization rejects spoofed, animated, empty and oversized inputs", async () => {
  for (const bytes of [Buffer.from("<svg>not a photo</svg>"), Buffer.alloc(0),
    await sharp(Buffer.concat([Buffer.alloc(64 * 64 * 3, 30), Buffer.alloc(64 * 64 * 3, 230)]), {
      raw: { width: 64, height: 128, channels: 3, pageHeight: 64 },
    }).webp({ loop: 0, delay: [100, 100] }).toBuffer()])
    await assert.rejects(encodeProfileImage(bytes, "banner", defaultProfilePictureCrop), InvalidProfileImage);
  await assert.rejects(encodeProfileImage(new Uint8Array(5 * 1024 * 1024 + 1), "banner", defaultProfilePictureCrop), RangeError);
});
test("banner crop headers reject wrong kinds, conflicting headers, malformed values and extra fields before storage", async () => {
  let queries = 0;
  const pool = { query: async () => { queries++; return { rows: [{ requests: 1, uploads: 1 }] }; } } as unknown as Pool;
  const storage = { put: async () => { throw new Error("Unexpected storage write"); }, get: async () => null, del: async () => {} };
  const api = createProfileMediaApi({ pool, storage, user: async () => ({ id: "owner", emailVerified: true }), origin: () => true });
  const valid = JSON.stringify(defaultProfilePictureCrop);
  const cases: [string, Record<string, string>][] = [
    ["avatar", { "X-Profile-Banner-Crop": valid }],
    ["banner", { "X-Profile-Picture-Crop": valid }],
    ["banner", { "X-Profile-Picture-Crop": valid, "X-Profile-Banner-Crop": valid }],
    ...["null", "{", "x".repeat(257), JSON.stringify({ ...defaultProfilePictureCrop, zoom: 4 }),
      JSON.stringify({ ...defaultProfilePictureCrop, url: "https://example.invalid" })].map(value => ["banner", { "X-Profile-Banner-Crop": value }] as [string, Record<string, string>]),
  ];
  for (const [kind, headers] of cases) {
    const response = await api("upload", new Request("https://physcratic.test/api", { method: "PUT", headers, body: "not an image" }), kind);
    assert.equal(response.status, 400);
  }
  assert.equal(queries, cases.length, "only the existing write limiter runs, with no media reservations");
  for (const [user, origin, status] of [[null, true, 401], [{ id: "owner", emailVerified: false }, true, 403],
    [{ id: "owner", emailVerified: true }, false, 403]] as const) {
    const protectedApi = createProfileMediaApi({ pool, storage, user: async () => user, origin: () => origin });
    const response = await protectedApi("upload", new Request("https://physcratic.test/api", {
      method: "PUT", headers: { "X-Profile-Banner-Crop": valid }, body: "not an image",
    }), "banner");
    assert.equal(response.status, status);
  }
  assert.equal(queries, cases.length);
});
