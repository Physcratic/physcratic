import assert from "node:assert/strict";
import test from "node:test";
import { detectAuthorMedia } from "./author-media-validation";
import {
  collectAuthorMedia,
  normalizeStatementImages,
  authorMediaPath,
} from "./author-media";
import { newProblem } from "./problem-authoring-editor";
import { png, pdf } from "../tests/author-media-fixtures";
import { randomUUID } from "node:crypto";
test("author media requires recognized, bounded format structure, not just a suffix or prefix", () => {
  assert.equal(detectAuthorMedia(png), "image/png");
  assert.equal(detectAuthorMedia(pdf), "application/pdf");
  for (const invalid of [
    Buffer.from("<svg onload='alert(1)'/>"),
    Buffer.from("<html>"),
    png.subarray(0, 16),
    Buffer.from("%PDF-1.7\n<script>"),
    Buffer.from([255, 216, 255, 255, 255, 255, 255, 255, 255, 255, 217]),
  ])
    assert.equal(detectAuthorMedia(invalid), null);
  const oversized = Buffer.from(png);
  oversized.writeUInt32BE(30000, 16);
  assert.equal(detectAuthorMedia(oversized), null);
  const webpHeader = Buffer.alloc(30);
  webpHeader.write("RIFF");
  webpHeader.writeUInt32LE(22, 4);
  webpHeader.write("WEBPVP8X", 8);
  webpHeader.writeUInt32LE(10, 16);
  assert.equal(
    detectAuthorMedia(webpHeader),
    null,
    "metadata-only WebP is not an image frame",
  );
});
test("reference collection separates statement and private images and rejects visibility reuse", () => {
  const { content } = newProblem(),
    id = randomUUID(),
    privateId = randomUUID();
  content.context = [
    {
      id: randomUUID(),
      kind: "image",
      mediaId: id,
      alt: "Diagram",
      caption: "",
    },
  ] as never;
  normalizeStatementImages(content);
  assert.deepEqual(content.attachments, [{ id, purpose: "statement-image" }]);
  const refs = collectAuthorMedia(content, [
    {
      hints: [
        {
          id: randomUUID(),
          kind: "image",
          mediaId: privateId,
          alt: "Private diagram",
          caption: "",
        },
      ],
      solution: [],
    },
  ]);
  assert.deepEqual(refs, [
    { id, purpose: "statement-image" },
    { id: privateId, purpose: "solution-image" },
  ]);
  assert.throws(() =>
    collectAuthorMedia(content, [
      {
        hints: [
          {
            id: randomUUID(),
            kind: "image",
            mediaId: id,
            alt: "Private",
            caption: "",
          },
        ],
        solution: [],
      },
    ]),
  );
  content.context = [];
  normalizeStatementImages(content);
  assert.deepEqual(content.attachments, []);
  assert.equal(
    authorMediaPath("p", "m", "r"),
    "/api/authored-problems/p/media/m?revision=r",
  );
});
