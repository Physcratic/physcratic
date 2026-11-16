// Run after pnpm build. Exercise Next's compiled metadata GET handlers from only
// their traced files, with no repository public/corpus fallback or live services.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { copyFileSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, readlinkSync, rmSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative, resolve, sep } from "node:path";
import sharp from "sharp";

const root = process.cwd();
const routes = [
  { route: "dashboard/problems/[id]", key: "id", ids: ["ipho-2024-t1", "eupho-2024-t2", "arena-the-infinite-v"] },
  { route: "learn/[slug]", key: "slug", ids: ["ipho-apho-eupho-differences"] },
  { route: "problems/topics/[slug]", key: "slug", ids: ["mechanics"] },
];
const worker = `
  const route = require(process.argv[1]).routeModule.userland;
  (async () => {
    try {
      const params = JSON.parse(process.argv[2]);
      const response = await route.GET(new Request('http://localhost/opengraph-image'), {params: Promise.resolve(params)});
      console.log(JSON.stringify({ status: response.status, type: response.headers.get('content-type'), png: Buffer.from(await response.arrayBuffer()).toString('base64') }));
    } catch (error) {
      if (error.digest === 'NEXT_HTTP_ERROR_FALLBACK;404') console.log(JSON.stringify({status: 404}));
      else throw error;
    }
  })().catch(error => { console.error(error); process.exitCode = 1; });
`;

for (const { route, key, ids } of routes) {
  const entry = `.next/server/app/${route}/opengraph-image/route.js`;
  const manifest = `${entry}.nft.json`;
  const files = JSON.parse(readFileSync(manifest, "utf8")).files.map(file => resolve(dirname(manifest), file));
  const publicFiles = files.map(file => relative(root, file).split(sep).join("/")).filter(file => file.startsWith("public/"));
  assert.deepEqual(publicFiles.sort(), ["public/logo-mark-transparent.png"], `${route}: trace only the public logo, never corpus or private assets`);
  const fixture = mkdtempSync(join(tmpdir(), "physcratic-og-trace-"));
  try {
    // Preserve pnpm symlinks, but copy only manifest entries, not dependency trees.
    for (const source of [resolve(entry), ...files]) {
      const local = relative(root, source);
      assert.ok(!local.startsWith(`..${sep}`) && local !== "..", "trace must stay within the build root");
      const target = join(fixture, local);
      mkdirSync(dirname(target), { recursive: true });
      if (lstatSync(source).isSymbolicLink()) symlinkSync(readlinkSync(source), target);
      else copyFileSync(source, target);
    }
    for (const id of [...ids, "unknown", "..%2Fprivate", "00000000-0000-4000-8000-000000000001"]) {
      const child = spawnSync(process.execPath, ["-e", worker, join(fixture, entry), JSON.stringify({ [key]: id })], {
        cwd: fixture,
        // Do not pass service credentials to the isolated runtime.
        env: { NODE_ENV: "production", PATH: process.env.PATH },
        encoding: "utf8",
        timeout: 30_000,
        maxBuffer: 2 * 1024 * 1024,
      });
      assert.equal(child.error, undefined);
      assert.equal(child.status, 0, child.stderr);
      const result = JSON.parse(child.stdout);
      if (!ids.includes(id)) {
        assert.equal(result.status, 404, `${route}/${id}`);
        continue;
      }
      assert.equal(result.status, 200);
      assert.equal(result.type, "image/png");
      const png = Buffer.from(result.png, "base64");
      assert.deepEqual(png.subarray(0, 8), Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
      const { info } = await sharp(png).raw().toBuffer({ resolveWithObject: true });
      assert.equal(info.width, 1200);
      assert.equal(info.height, 630);
      console.log(`PASS /${route.replace(`[${key}]`, id)}/opengraph-image: decoded PNG 1200x630 from traced files only`);
    }
  } finally {
    rmSync(fixture, { recursive: true, force: true });
  }
}
