import assert from "node:assert/strict";
import test from "node:test";
import React, { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import PrivacyPage from "../app/privacy/page";

Object.assign(globalThis, { React });

test("privacy notice explains staged deletion and offers a public support route", () => {
  const html = renderToStaticMarkup(createElement(PrivacyPage));
  assert.match(html, /If Delete account is available in Settings/);
  assert.match(html, /Files can still be awaiting cleanup/);
  assert.match(html, /Tally submissions/);
  assert.match(html, /backup or recovery copies/);
  assert.match(html, /can.t sign in or check your receipt/);
  assert.match(html, /href="https:\/\/tally\.so\/r\/rD5oVX"/);
  assert.doesNotMatch(html, /Self-service account deletion is currently unavailable/);
});
