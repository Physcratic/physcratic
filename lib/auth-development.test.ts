import assert from "node:assert/strict";
import { test } from "node:test";
import { developmentCookieAttributes } from "./auth-development";

for (const host of ["localhost", "127.0.0.1", "[::1]"]) test(`HTTP ${host} development sessions can retain cookies`, () => {
  assert.deepEqual(developmentCookieAttributes(`http://${host}:3000`, "development"), { sameSite: "lax", secure: false });
});
for (const url of ["https://localhost:3000", "http://localhost.evil.test:3000", "https://preview.example.test", "http://remote.example.test", "http://user@localhost:3000", undefined]) test(`preview cookie policy stays secure for ${url}`, () => {
  assert.deepEqual(developmentCookieAttributes(url, "development"), { sameSite: "none", secure: true });
});
test("local development exceptions never change production or test cookies", () => {
  for (const env of ["production", "test", undefined]) assert.equal(developmentCookieAttributes("http://localhost:3000", env), undefined);
});
